import { Module } from '@nestjs/common';
import { AppSettingsModule } from '../app-settings/app-settings.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { ExchangeRateController } from './exchange-rate.controller';
import { ExchangeRateScheduler } from './exchange-rate.scheduler';
import { ExchangeRateService } from './exchange-rate.service';

@Module({
  imports: [PrismaModule, AppSettingsModule],
  controllers: [ExchangeRateController],
  providers: [ExchangeRateService, ExchangeRateScheduler],
  exports: [ExchangeRateService],
})
export class ExchangeRateModule {}
