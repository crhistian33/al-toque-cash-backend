import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { SettingKey } from 'generated/prisma/enums';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { AppSettingsService } from './app-settings.service';

class UpdateSettingDto {
  @IsEnum(SettingKey)
  key: SettingKey;

  @IsString()
  @IsNotEmpty()
  value: string;
}

/**
 * Endpoints de administración para gestionar configuraciones globales.
 * Todos los endpoints requieren autenticación de administrador.
 */
@Controller('admin/settings')
@UseGuards(AdminAuthGuard)
export class AppSettingsController {
  constructor(private readonly appSettings: AppSettingsService) {}

  /** Devuelve todas las configuraciones actuales del sistema. */
  @Get()
  findAll() {
    return this.appSettings.findAll();
  }

  /**
   * Actualiza (o crea) una configuración por clave.
   * Usar para cambiar márgenes de tipo de cambio o el número de WhatsApp.
   */
  @Patch()
  @HttpCode(HttpStatus.OK)
  update(@Body() dto: UpdateSettingDto) {
    return this.appSettings.set(dto.key, dto.value);
  }
}
