import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";
import { Currency, Bank } from "generated/prisma/enums";

export class CreateAccountDto {
  @IsEnum(Currency, { message: "La moneda debe ser USD o PEN" })
  currency: Currency;

  @IsEnum(Bank, { message: "Banco inválido" })
  bank: Bank;

  @IsString()
  @MinLength(4)
  accountNumber: string;

  @IsOptional()
  @IsString()
  cci?: string;

  @IsString()
  @IsNotEmpty()
  accountHolderName: string;
}
