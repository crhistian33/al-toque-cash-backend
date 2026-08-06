import { IsNumber, IsPositive } from 'class-validator';

export class CreateExchangeRateDto {
  @IsNumber()
  @IsPositive()
  buyRate: number;

  @IsNumber()
  @IsPositive()
  sellRate: number;
}
