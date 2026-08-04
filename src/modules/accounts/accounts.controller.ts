import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AccountsService } from "./accounts.service";
import { CreateAccountDto } from "./dto/create-account.dto";
import { UpdateAccountDto } from "./dto/update-account.dto";
import { ClerkAuthGuard } from "../../common/guards/clerk-auth.guard";
import {
  CurrentUser,
  ClerkAuthPayload,
} from "../../common/decorators/current-user.decorator";
import { Currency } from "generated/prisma/enums";
import { ApiBearerAuth } from "@nestjs/swagger";

@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller("accounts")
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  /**
   * Cuentas del cliente autenticado. Se usa en la pantalla de "Cambiar
   * ahora": ?currency=USD devuelve solo las cuentas en esa moneda para
   * decidir si se muestra el selector o el botón "Añadir cuenta".
   */
  @Get("mine")
  async findMine(
    @CurrentUser() auth: ClerkAuthPayload,
    @Query("currency") currency?: Currency,
  ) {
    if (currency)
      return this.accountsService.findMineByCurrency(auth.clerkId, currency);
    return this.accountsService.findMine(auth.clerkId);
  }

  @Post()
  async create(
    @CurrentUser() auth: ClerkAuthPayload,
    @Body() dto: CreateAccountDto,
  ) {
    return this.accountsService.create(auth.clerkId, dto);
  }

  @Patch(":id")
  async update(
    @CurrentUser() auth: ClerkAuthPayload,
    @Param("id") id: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.accountsService.update(auth.clerkId, id, dto);
  }

  @Delete(":id")
  async remove(@CurrentUser() auth: ClerkAuthPayload, @Param("id") id: string) {
    return this.accountsService.remove(auth.clerkId, id);
  }
}
