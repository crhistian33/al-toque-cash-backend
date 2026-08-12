import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { CustomersModule } from './modules/customers/customers.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { ExchangeRateModule } from './modules/exchange-rate/exchange-rate.module';
import { AppSettingsModule } from './modules/app-settings/app-settings.module';
import { ContactModule } from './modules/contact/contact.module';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{
      ttl: 600000, // 10 minutos en ms
      limit: 5,
    }]),
    PrismaModule,
    AuthModule,
    CustomersModule,
    AccountsModule,
    TransactionsModule,
    ExchangeRateModule,
    AppSettingsModule,
    ContactModule,
  ],
})
export class AppModule {}
