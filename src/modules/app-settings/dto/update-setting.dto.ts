import { SettingKey } from "../../../../generated/prisma/enums";
import { IsEnum, IsNotEmpty, IsString } from "class-validator";

export class UpdateSettingDto {
  @IsEnum(SettingKey)
  key: SettingKey;

  @IsString()
  @IsNotEmpty()
  value: string;
}
