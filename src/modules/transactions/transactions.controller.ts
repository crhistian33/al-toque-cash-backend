import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { TransactionsService } from "./transactions.service";
import { CreateTransactionDto } from "./dto/create-transaction.dto";
import { UpdateTransactionStatusDto } from "./dto/update-transaction-status.dto";
import { ClerkAuthGuard } from "../../common/guards/clerk-auth.guard";
import { AdminAuthGuard } from "../../common/guards/admin-auth.guard";
import {
  CurrentUser,
  ClerkAuthPayload,
} from "../../common/decorators/current-user.decorator";

@UseGuards(ClerkAuthGuard)
@Controller("transactions")
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  /**
   * Crea la solicitud de cambio en estado PENDING y devuelve el link de
   * WhatsApp (con monto, moneda y cuenta ya redactados) para que el
   * cliente envíe el voucher desde la página de success.
   */
  @Post()
  async create(
    @CurrentUser() auth: ClerkAuthPayload,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.transactionsService.create(auth.clerkId, dto);
  }

  @Get("mine")
  async findMine(@CurrentUser() auth: ClerkAuthPayload) {
    return this.transactionsService.findMine(auth.clerkId);
  }

  @Get("mine/:id")
  async findOneMine(
    @CurrentUser() auth: ClerkAuthPayload,
    @Param("id") id: string,
  ) {
    return this.transactionsService.findOneMine(auth.clerkId, id);
  }

  // ── Endpoints para el futuro CMS de administración ────

  @UseGuards(AdminAuthGuard)
  @Get()
  async findAll() {
    return this.transactionsService.findAllAdmin();
  }

  @UseGuards(AdminAuthGuard)
  @Patch(":id/status")
  async updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateTransactionStatusDto,
  ) {
    return this.transactionsService.updateStatusAdmin(id, dto);
  }
}
