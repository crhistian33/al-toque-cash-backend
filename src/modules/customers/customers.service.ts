import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UpdateCustomerDto } from "./dto/update-customer.dto";

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findByClerkId(clerkId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { clerkId },
      include: { accounts: true },
    });
    if (!customer) {
      throw new NotFoundException(
        "Cliente no encontrado. Llama a /auth/sync primero.",
      );
    }
    return customer;
  }

  async update(clerkId: string, dto: UpdateCustomerDto) {
    await this.findByClerkId(clerkId);
    return this.prisma.customer.update({ where: { clerkId }, data: dto });
  }

  // ── Uso administrativo (CMS) ──────────────────────────
  async findAllAdmin() {
    return this.prisma.customer.findMany({
      include: { accounts: true, _count: { select: { transactions: true } } },
      orderBy: { createdAt: "desc" },
    });
  }
}
