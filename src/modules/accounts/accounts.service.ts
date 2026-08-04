import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateAccountDto } from "./dto/create-account.dto";
import { UpdateAccountDto } from "./dto/update-account.dto";
import { Currency } from "generated/prisma/enums";

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  private async getCustomerOrThrow(clerkId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { clerkId },
    });
    if (!customer) {
      throw new NotFoundException(
        "Cliente no encontrado. Llama a /auth/sync primero.",
      );
    }
    return customer;
  }

  /** Todas las cuentas del cliente autenticado */
  async findMine(clerkId: string) {
    const customer = await this.getCustomerOrThrow(clerkId);
    return this.prisma.account.findMany({
      where: { customerId: customer.id, isActive: true },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Cuentas del cliente filtradas por moneda (usado en la pantalla de cambio) */
  async findMineByCurrency(clerkId: string, currency: Currency) {
    const customer = await this.getCustomerOrThrow(clerkId);
    return this.prisma.account.findMany({
      where: { customerId: customer.id, currency, isActive: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(clerkId: string, dto: CreateAccountDto) {
    const customer = await this.getCustomerOrThrow(clerkId);

    const exists = await this.prisma.account.findFirst({
      where: {
        customerId: customer.id,
        currency: dto.currency,
        accountNumber: dto.accountNumber,
      },
    });
    if (exists)
      throw new ConflictException("Ya registraste esta cuenta con esta moneda");

    return this.prisma.account.create({
      data: { ...dto, customerId: customer.id },
    });
  }

  async update(clerkId: string, accountId: string, dto: UpdateAccountDto) {
    const account = await this.findOwnedOrThrow(clerkId, accountId);
    return this.prisma.account.update({ where: { id: account.id }, data: dto });
  }

  async remove(clerkId: string, accountId: string) {
    const account = await this.findOwnedOrThrow(clerkId, accountId);
    // Soft delete para no romper el historial de transacciones asociadas
    return this.prisma.account.update({
      where: { id: account.id },
      data: { isActive: false },
    });
  }

  private async findOwnedOrThrow(clerkId: string, accountId: string) {
    const customer = await this.getCustomerOrThrow(clerkId);
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });
    if (!account) throw new NotFoundException("Cuenta no encontrada");
    if (account.customerId !== customer.id) {
      throw new ForbiddenException("Esta cuenta no te pertenece");
    }
    return account;
  }
}
