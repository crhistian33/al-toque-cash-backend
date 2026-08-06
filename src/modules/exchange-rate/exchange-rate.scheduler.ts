import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ExchangeRateService } from './exchange-rate.service';

@Injectable()
export class ExchangeRateScheduler {
  private readonly logger = new Logger(ExchangeRateScheduler.name);

  constructor(private readonly exchangeRateService: ExchangeRateService) {}

  /**
   * Se ejecuta de lunes a viernes a las 9:00 AM y 2:00 PM (hora de Perú, UTC-5).
   * La API del BCRP suele publicar el dato del día después del mediodía,
   * por lo que la segunda ejecución siempre capturará el valor oficial del día.
   *
   * Si syncWithBCRP devuelve null (no hubo datos válidos), se registra una
   * advertencia pero el scheduler NO lanza excepción — la siguiente ejecución
   * lo reintentará.
   */
  @Cron('0 9,14 * * 1-5', { timeZone: 'America/Lima' })
  async handleCron() {
    this.logger.log('Ejecutando cron job de sincronización de tipo de cambio...');
    try {
      const result = await this.exchangeRateService.syncWithBCRP();
      if (!result) {
        this.logger.warn(
          'La sincronización no encontró datos válidos en el BCRP; se omitió la actualización.',
        );
      }
    } catch (error) {
      // ServiceUnavailableException u otros errores: se loguea y se espera la próxima ejecución.
      this.logger.error('El cron job falló al sincronizar el tipo de cambio', error);
    }
  }
}
