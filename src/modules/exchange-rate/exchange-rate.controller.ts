import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ExchangeRateService } from "./exchange-rate.service";
import { CreateExchangeRateDto } from "./dto/create-exchange-rate.dto";
import { AdminAuthGuard } from "../../common/guards/admin-auth.guard";
import {
  ClerkAuthPayload,
  CurrentUser,
} from "../../common/decorators/current-user.decorator";
import { ApiBearerAuth } from "@nestjs/swagger";
import { ClerkAuthGuard } from "src/common/guards/clerk-auth.guard";

@Controller("exchange-rate")
export class ExchangeRateController {
  constructor(private readonly exchangeRateService: ExchangeRateService) {}

  /**
   * Endpoint PÚBLICO para obtener la tasa de cambio actual.
   * Usado por el frontend (simulador y paso 2 del wizard).
   */
  @Get("latest")
  async getLatest() {
    return this.exchangeRateService.getLatest();
  }

  /**
   * Endpoint protegido (solo admin) para forzar una actualización manual.
   */
  @ApiBearerAuth("clerk-auth")
  @UseGuards(ClerkAuthGuard, AdminAuthGuard)
  @Post()
  async createManual(
    @Body() dto: CreateExchangeRateDto,
    @CurrentUser() auth: ClerkAuthPayload,
  ) {
    return this.exchangeRateService.createManual(dto, auth.clerkId);
  }

  @ApiBearerAuth("clerk-auth")
  @UseGuards(ClerkAuthGuard, AdminAuthGuard)
  @Post("sync")
  async syncRates() {
    const result = await this.exchangeRateService.syncWithBCRP();
    if (!result) {
      // Podrías devolver un 404 o un mensaje informativo
      throw new NotFoundException(
        "No se encontraron datos válidos en la API del BCRP en los últimos 7 días.",
      );
    }
    return result;
  }
}
