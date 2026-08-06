import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { AppSettingsService } from "../app-settings/app-settings.service";
import { CreateExchangeRateDto } from "./dto/create-exchange-rate.dto";
import { ExchangeRateSource } from "generated/prisma/enums";

@Injectable()
export class ExchangeRateService {
  private readonly logger = new Logger(ExchangeRateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly appSettings: AppSettingsService,
    private readonly config: ConfigService,
  ) {}
  // Si el dato más reciente disponible tiene más de este número de días de
  // antigüedad respecto a hoy, se considera "stale" y se loguea un warning
  // (el sync igual continúa, para no dejar el sitio sin tasa, pero queda
  // registrado para que se investigue).
  private readonly STALE_THRESHOLD_DAYS = 5;

  // ── Consultas ───────────────────────────────────────────

  /**
   * Devuelve el último tipo de cambio registrado en la base de datos.
   * Lanza NotFoundException si la tabla está vacía (ejecutar seed antes).
   */
  async getLatest() {
    const rate = await this.prisma.exchangeRate.findFirst({
      orderBy: { createdAt: "desc" },
    });

    if (!rate) {
      throw new NotFoundException(
        "No hay ningún tipo de cambio registrado. Ejecuta el seed o espera la primera sincronización automática.",
      );
    }

    return {
      buyRate: Number(rate.buyRate),
      sellRate: Number(rate.sellRate),
      updatedAt: rate.createdAt,
    };
  }

  // ── Sincronización BCRP ─────────────────────────────────

  /**
   * Consulta la API del BCRP para los últimos 7 días, selecciona el primer
   * periodo con valores numéricos válidos (descarta "n.d." de fines de semana
   * y feriados), aplica los márgenes de la tabla AppSetting y guarda un nuevo
   * registro de ExchangeRate.
   *
   * Devuelve el registro guardado, o null si no se encontraron datos válidos.
   */
  async syncWithBCRP() {
    this.logger.log("Sincronizando tipo de cambio con BCRP (fuente: SBS)...");

    try {
      const [buyMargin, sellMargin] = await Promise.all([
        this.appSettings.getBuyMargin(),
        this.appSettings.getSellMargin(),
      ]);

      const baseUrl = this.config.get<string>("EXCHANGE_RATE_API_URL");
      if (!baseUrl) {
        throw new Error(
          "EXCHANGE_RATE_API_URL no está definida en las variables de entorno.",
        );
      }

      this.logger.debug(`Consultando BCRP: ${baseUrl}`);

      const response = await fetch(baseUrl);
      if (!response.ok) {
        throw new Error(
          `BCRP HTTP error: ${response.status} ${response.statusText}`,
        );
      }

      const rawText = await response.text();
      const data = this.parseBcrpResponse(rawText);

      const seriesMeta: Array<{ name: string }> = data?.config?.series ?? [];
      const periods: Array<{ name: string; values: string[] }> =
        data?.periods ?? [];

      if (seriesMeta.length < 2 || periods.length === 0) {
        this.logger.warn(
          "La API del BCRP no devolvió la estructura esperada (series/periods).",
        );
        return null;
      }

      // IMPORTANTE: el orden de las series en la respuesta del BCRP NO está
      // garantizado que respete el orden de los códigos pedidos en la URL
      // (verificado empíricamente: pedimos Compra-Venta y en un caso real
      // respondió Venta-Compra). Por eso, en vez de asumir una posición fija,
      // se detecta el índice de cada serie leyendo su nombre.
      const buyIndex = seriesMeta.findIndex((s) => /compra/i.test(s.name));
      const sellIndex = seriesMeta.findIndex((s) => /venta/i.test(s.name));

      if (buyIndex === -1 || sellIndex === -1) {
        this.logger.error(
          `No se identificó Compra/Venta en las series: ${JSON.stringify(seriesMeta)}`,
        );
        throw new Error(
          "No se pudo identificar las series de Compra/Venta en la respuesta del BCRP.",
        );
      }

      this.logger.debug(
        `Series detectadas -> Compra: índice ${buyIndex} ("${seriesMeta[buyIndex].name}"), Venta: índice ${sellIndex} ("${seriesMeta[sellIndex].name}")`,
      );

      // Del más reciente al más antiguo, buscando el primer periodo con
      // datos numéricos válidos (protege contra "n.d." en feriados/fines de semana).
      const sorted = [...periods].reverse();

      for (const period of sorted) {
        const rawBuy = parseFloat(period.values?.[buyIndex]);
        const rawSell = parseFloat(period.values?.[sellIndex]);

        if (isNaN(rawBuy) || isNaN(rawSell)) {
          this.logger.debug(
            `Periodo ${period.name} sin datos válidos, continuando...`,
          );
          continue;
        }

        // Qué tan reciente es el dato encontrado respecto a hoy.
        const periodDate = this.parseBcrpDate(period.name);
        const daysOld = periodDate
          ? Math.floor(
              (Date.now() - periodDate.getTime()) / (1000 * 60 * 60 * 24),
            )
          : null;

        if (daysOld !== null && daysOld > this.STALE_THRESHOLD_DAYS) {
          this.logger.warn(
            `El dato más reciente disponible del BCRP tiene ${daysOld} días de antigüedad (periodo ${period.name}). Verifica si la fuente está actualizada.`,
          );
        }

        const finalBuyRate = rawBuy + buyMargin;
        const finalSellRate = rawSell + sellMargin;

        const savedRate = await this.prisma.exchangeRate.create({
          data: {
            buyRate: finalBuyRate,
            sellRate: finalSellRate,
            source: ExchangeRateSource.SBS_API,
          },
        });

        this.logger.log(
          `Tipo de cambio sincronizado desde periodo ${period.name} (${daysOld ?? "?"} días de antigüedad): ` +
            `Compra ${finalBuyRate} (base ${rawBuy} + margen ${buyMargin}), ` +
            `Venta ${finalSellRate} (base ${rawSell} + margen ${sellMargin})`,
        );

        return savedRate;
      }

      this.logger.warn(
        "No se encontraron valores numéricos válidos en los periodos recibidos.",
      );
      return null;
    } catch (error) {
      this.logger.error("Error al sincronizar con BCRP", error);
      throw new ServiceUnavailableException(
        "No se pudo obtener el tipo de cambio desde el BCRP. Intenta más tarde.",
      );
    }
  }

  private parseBcrpDate(periodName: string): Date | null {
    const meses: Record<string, number> = {
      ene: 0,
      feb: 1,
      mar: 2,
      abr: 3,
      may: 4,
      jun: 5,
      jul: 6,
      ago: 7,
      set: 8,
      sep: 8,
      oct: 9,
      nov: 10,
      dic: 11,
    };
    const match = periodName.match(/^(\d{2})\.(\w{3})\.(\d{2})$/i);
    if (!match) return null;

    const [, day, monStr, yy] = match;
    const month = meses[monStr.toLowerCase()];
    if (month === undefined) return null;

    return new Date(2000 + parseInt(yy, 10), month, parseInt(day, 10));
  }

  private parseBcrpResponse(rawText: string): any {
    try {
      return JSON.parse(rawText);
    } catch {
      this.logger.warn(
        "Respuesta del BCRP no es JSON puro (probablemente aviso de debug de su servidor), extrayendo el primer objeto válido...",
      );
    }

    const start = rawText.indexOf("{");
    if (start === -1) {
      this.logger.error(
        `Respuesta sin JSON reconocible: ${rawText.slice(0, 500)}`,
      );
      throw new Error("La API del BCRP devolvió una respuesta sin JSON.");
    }

    let depth = 0;
    for (let i = start; i < rawText.length; i++) {
      if (rawText[i] === "{") depth++;
      else if (rawText[i] === "}") {
        depth--;
        if (depth === 0) {
          const jsonSlice = rawText.slice(start, i + 1);
          try {
            const parsed = JSON.parse(jsonSlice);
            const extra = rawText.slice(i + 1).trim();
            if (extra) {
              this.logger.debug(
                `Contenido extra ignorado tras el JSON (${extra.length} caracteres, probablemente debug del servidor del BCRP)`,
              );
            }
            return parsed;
          } catch {
            this.logger.error(
              `El objeto JSON extraído tampoco es válido: ${jsonSlice.slice(-500)}`,
            );
            throw new Error(
              "La API del BCRP devolvió una respuesta inesperada (no-JSON).",
            );
          }
        }
      }
    }

    this.logger.error(
      `Respuesta con JSON incompleto (primeros 1000 caracteres): ${rawText.slice(0, 1000)}`,
    );
    throw new Error(
      "La API del BCRP devolvió una respuesta inesperada (no-JSON).",
    );
  }

  // ── Administración ──────────────────────────────────────

  /**
   * Permite a un administrador registrar manualmente el tipo de cambio.
   * Los valores se guardan tal cual, SIN aplicar márgenes.
   */
  async createManual(dto: CreateExchangeRateDto, adminClerkId: string) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { clerkId: adminClerkId },
      select: { id: true },
    });

    if (!admin) {
      throw new NotFoundException("Usuario admin no encontrado.");
    }

    return this.prisma.exchangeRate.create({
      data: {
        buyRate: dto.buyRate,
        sellRate: dto.sellRate,
        source: ExchangeRateSource.MANUAL,
        createdBy: admin.id,
      },
    });
  }
}
