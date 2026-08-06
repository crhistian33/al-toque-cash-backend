import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingKey } from 'generated/prisma/enums';

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

  /** Devuelve todas las configuraciones (para el panel de administración). */
  async findAll() {
    return this.prisma.appSetting.findMany({
      orderBy: { key: 'asc' },
    });
  }

  // ── Helpers semánticos ──────────────────────────────────

  /** Margen de compra en soles (parseado como float, 0 si no está configurado). */
  async getBuyMargin(): Promise<number> {
    const val = await this.get(SettingKey.EXCHANGE_RATE_BUY_MARGIN);
    const parsed = parseFloat(val ?? '0');
    return isNaN(parsed) ? 0 : parsed;
  }

  /** Margen de venta en soles (parseado como float, 0 si no está configurado). */
  async getSellMargin(): Promise<number> {
    const val = await this.get(SettingKey.EXCHANGE_RATE_SELL_MARGIN);
    const parsed = parseFloat(val ?? '0');
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Número de WhatsApp en formato internacional (ej: +51999999999).
   * Si no está en la base de datos devuelve el fallback genérico.
   */
  async getWhatsAppNumber(): Promise<string> {
    const val = await this.get(SettingKey.WHATSAPP_NUMBER);
    return val || '+51999999999';
  }
}
