import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { CustomersService } from "./customers.service";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import { ClerkAuthGuard } from "../../common/guards/clerk-auth.guard";
import { AdminAuthGuard } from "../../common/guards/admin-auth.guard";
import {
  CurrentUser,
  ClerkAuthPayload,
} from "../../common/decorators/current-user.decorator";

@UseGuards(ClerkAuthGuard)
@Controller("customers")
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  /** Perfil del cliente autenticado, con sus cuentas bancarias */
  @Get("me")
  async me(@CurrentUser() auth: ClerkAuthPayload) {
    return this.customersService.findByClerkId(auth.clerkId);
  }

  @Patch("me")
  async updateMe(
    @CurrentUser() auth: ClerkAuthPayload,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(auth.clerkId, dto);
  }

  /** Listado para el futuro CMS de administración */
  @UseGuards(AdminAuthGuard)
  @Get()
  async findAll() {
    return this.customersService.findAllAdmin();
  }
}
