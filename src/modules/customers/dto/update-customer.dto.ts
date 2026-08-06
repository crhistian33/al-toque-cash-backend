import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { DocumentType } from 'generated/prisma/enums';

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(DocumentType, { message: 'El tipo de documento debe ser DNI o RUC' })
  documentType?: DocumentType;

  @IsOptional()
  @IsString()
  @Matches(/^\d{8}$|^\d{11}$/, {
    message: 'El número de documento debe tener 8 dígitos (DNI) o 11 dígitos (RUC)',
  })
  documentNumber?: string;
}
