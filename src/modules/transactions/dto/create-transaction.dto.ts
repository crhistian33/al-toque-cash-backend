import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
} from "class-validator";
import { Currency } from "generated/prisma/client";

export class CreateTransactionDto {
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @IsEnum(Currency)
  sentCurrency: Currency;

  @IsNumber()
  @IsPositive()
  sentAmount: number;

  @IsEnum(Currency)
  receivedCurrency: Currency;

  @IsNumber()
  @IsPositive()
  receivedAmount: number;

  @IsNumber()
  @IsPositive()
  exchangeRate: number;
}
