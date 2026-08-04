import { IsEnum, IsOptional, IsString } from "class-validator";
import { TransactionStatus } from "generated/prisma/client";

export class UpdateTransactionStatusDto {
  @IsEnum(TransactionStatus)
  status: TransactionStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
