import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { SettingKey } from "generated/prisma/enums";
import {
  AdminSettingsDto,
  CompanyBankAccount,
  PublicSettingsDto,
} from "./types/app-settings.types";

@Injectable()
export class AppSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene el valor de una configuración por su clave.
   * Devuelve null si la clave no existe aún en la base de datos.
   */
  async get(key: SettingKey): Promise<string | null> {
    const setting = await this.prisma.appSetting.findUnique({
      where: { key },
      select: { value: true },
    });
    return setting?.value ?? null;
  }

  /**
   * Crea o actualiza una configuración (upsert).
   * Retorna el registro resultante.
   */
  async set(key: SettingKey, value: string) {
    return this.prisma.appSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  /** Devuelve todas las filas raw (para usos internos o listados planos). */
  async findAll() {
    return this.prisma.appSetting.findMany({
      orderBy: { key: "asc" },
    });
  }

  /**
   * [ADMIN] Devuelve todas las configuraciones del sistema como objeto tipado,
   * incluyendo los márgenes internos de tipo de cambio.
   */
  async getAll(): Promise<AdminSettingsDto> {
    const rows = await this.prisma.appSetting.findMany();
    const map = new Map(rows.map((r) => [r.key, r.value]));

    const parseNum = (v: string | undefined): number => {
      const n = parseFloat(v ?? "0");
      return isNaN(n) ? 0 : n;
    };

    return {
      exchangeRateBuyMargin: parseNum(
        map.get(SettingKey.EXCHANGE_RATE_BUY_MARGIN),
      ),
      exchangeRateSellMargin: parseNum(
        map.get(SettingKey.EXCHANGE_RATE_SELL_MARGIN),
      ),
      ...this._buildPublicPayload(map),
    };
  }

  /**
   * [PÚBLICO] Subset de configuraciones seguro para exponer al frontend.
   * Excluye datos internos como los márgenes de tipo de cambio.
   */
  async getPublicSettings(): Promise<PublicSettingsDto> {
    const rows = await this.prisma.appSetting.findMany();
    const map = new Map(rows.map((r) => [r.key, r.value]));
    return this._buildPublicPayload(map);
  }

  // ── Helpers privados ──────────────────────────────────────

  /**
   * Construye el payload público compartido por getAll() y getPublicSettings().
   * Centraliza la lógica de transformación para evitar duplicación.
   */
  private _buildPublicPayload(map: Map<string, string>): PublicSettingsDto {
    const nullIfEmpty = (v: string | undefined): string | null =>
      v && v.trim() !== "" ? v : null;

    const parseBankAccounts = (v: string | undefined): CompanyBankAccount[] => {
      if (!v || v.trim() === "") return [];
      try {
        const parsed = JSON.parse(v);
        return Array.isArray(parsed) ? (parsed as CompanyBankAccount[]) : [];
      } catch {
        return [];
      }
    };

    return {
      whatsappNumber: nullIfEmpty(map.get(SettingKey.WHATSAPP_NUMBER)),
      phoneNumber: nullIfEmpty(map.get(SettingKey.PHONE_NUMBER)),
      address: nullIfEmpty(map.get(SettingKey.ADDRESS)),
      schedule1: nullIfEmpty(map.get(SettingKey.SCHEDULE_1)),
      schedule2: nullIfEmpty(map.get(SettingKey.SCHEDULE_2)),
      footerDescription: nullIfEmpty(map.get(SettingKey.FOOTER_DESCRIPTION)),
      logoUrl: nullIfEmpty(map.get(SettingKey.LOGO_URL)),
      companyBankAccounts: parseBankAccounts(
        map.get(SettingKey.COMPANY_BANK_ACCOUNTS),
      ),
      email: nullIfEmpty(map.get(SettingKey.EMAIL)),
    };
  }

  // ── Helpers semánticos públicos ───────────────────────────

  /** Margen de compra en soles (parseado como float, 0 si no está configurado). */
  async getBuyMargin(): Promise<number> {
    const val = await this.get(SettingKey.EXCHANGE_RATE_BUY_MARGIN);
    const parsed = parseFloat(val ?? "0");
    return isNaN(parsed) ? 0 : parsed;
  }

  /** Margen de venta en soles (parseado como float, 0 si no está configurado). */
  async getSellMargin(): Promise<number> {
    const val = await this.get(SettingKey.EXCHANGE_RATE_SELL_MARGIN);
    const parsed = parseFloat(val ?? "0");
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Número de WhatsApp en formato internacional (ej: +51999999999).
   * Si no está en la base de datos devuelve el fallback genérico.
   */
  async getWhatsAppNumber(): Promise<string> {
    const val = await this.get(SettingKey.WHATSAPP_NUMBER);
    return val || "+51999999999";
  }

  /** Teléfono de contacto visible en el sitio. Null si no está configurado. */
  async getPhoneNumber(): Promise<string | null> {
    return this.get(SettingKey.PHONE_NUMBER);
  }

  /** Dirección física del local. Null si no está configurada o no aplica. */
  async getAddress(): Promise<string | null> {
    return this.get(SettingKey.ADDRESS);
  }

  /** Horario de atención principal. Null si no está configurado. */
  async getSchedule1(): Promise<string | null> {
    return this.get(SettingKey.SCHEDULE_1);
  }

  /** Horario de atención secundario. Null si no está configurado. */
  async getSchedule2(): Promise<string | null> {
    return this.get(SettingKey.SCHEDULE_2);
  }

  /** Descripción corta del footer. Null si no está configurada. */
  async getFooterDescription(): Promise<string | null> {
    return this.get(SettingKey.FOOTER_DESCRIPTION);
  }

  /** URL pública del logo. Null si no está configurada. */
  async getLogoUrl(): Promise<string | null> {
    return this.get(SettingKey.LOGO_URL);
  }

  /** Cuentas bancarias de la empresa. Array vacío si no están configuradas. */
  async getCompanyBankAccounts(): Promise<CompanyBankAccount[]> {
    const val = await this.get(SettingKey.COMPANY_BANK_ACCOUNTS);
    if (!val || val.trim() === "") return [];
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? (parsed as CompanyBankAccount[]) : [];
    } catch {
      return [];
    }
  }
}
