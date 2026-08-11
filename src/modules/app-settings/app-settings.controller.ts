import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { ApiResponse, ok } from '../../common';
import { AppSettingsService } from './app-settings.service';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { AdminSettingsDto, PublicSettingsDto } from './types/app-settings.types';

@Controller()
export class AppSettingsController {
  constructor(private readonly appSettings: AppSettingsService) {}

  /**
   * [PÚBLICO] Devuelve las configuraciones visibles para el frontend:
   * datos de contacto, horarios, footer, logo y cuentas bancarias.
   * No requiere autenticación ni expone datos internos.
   */
  @Get('settings')
  async getPublicSettings(): Promise<ApiResponse<PublicSettingsDto>> {
    const data = await this.appSettings.getPublicSettings();
    return ok(data, 'Configuraciones públicas obtenidas correctamente');
  }

  /**
   * [ADMIN] Devuelve todas las configuraciones del sistema, incluidos
   * los márgenes internos de tipo de cambio.
   * Requiere autenticación de administrador.
   */
  @Get('admin/settings')
  @UseGuards(AdminAuthGuard)
  async findAll(): Promise<ApiResponse<AdminSettingsDto>> {
    const data = await this.appSettings.getAll();
    return ok(data, 'Configuraciones del sistema obtenidas correctamente');
  }

  /**
   * [ADMIN] Actualiza (o crea) una configuración por clave.
   * Usar para cambiar márgenes, datos de contacto, cuentas bancarias, etc.
   */
  @Patch('admin/settings')
  @UseGuards(AdminAuthGuard)
  @HttpCode(HttpStatus.OK)
  async update(@Body() dto: UpdateSettingDto): Promise<ApiResponse<{ key: string; value: string }>> {
    const data = await this.appSettings.set(dto.key, dto.value);
    return ok(
      { key: data.key, value: data.value },
      `Configuración "${dto.key}" actualizada correctamente`,
    );
  }
}
