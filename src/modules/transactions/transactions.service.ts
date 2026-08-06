import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Bank, TransactionStatus } from "generated/prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AppSettingsService } from "../app-settings/app-settings.service";
import { CreateTransactionDto } from "./dto/create-transaction.dto";
import { UpdateTransactionStatusDto } from "./dto/update-transaction-status.dto";

const BANK_LABELS: Record<Bank, string> = {
  BCP: "BCP",
  INTERBANK: "Interbank",
  SCOTIABANK: "Scotiabank",
  BBVA: "BBVA",
  BANCO_FALABELLA: "Banco Falabella",
  OTROS: "Otro banco",
};

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appSettings: AppSettingsService,
  ) {}

  // ── Helpers privados ────────────────────────────────────

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

  /**
   * Construye el enlace wa.me con los datos de la operación pre-cargados
   * en el mensaje. Lee el número de WhatsApp desde AppSettings (base de datos).
   */
  private async buildWhatsappUrl(
    transaction: Awaited<ReturnType<typeof this.prisma.transaction.create>>,
    account: {
      bank: Bank;
      accountNumber: string;
      currency: string;
      cci?: string | null;
    },
  ): Promise<string> {
    const phone = await this.appSettings.getWhatsAppNumber();

    const messageLines = [
      `*NUEVA SOLICITUD DE CAMBIO* 💱`,
      `ID: #${transaction.id.slice(0, 8).toUpperCase()}`,
      ``,
      `*Monto a enviar:* ${transaction.sentAmount} ${transaction.sentCurrency}`,
      `*Monto a recibir:* ${transaction.receivedAmount} ${transaction.receivedCurrency}`,
      ``,
      `*🏦 Cuenta Destino*`,
      `Banco: ${BANK_LABELS[account.bank]}`,
      `Moneda: ${account.currency}`,
      `Nro. Cuenta: ${account.accountNumber}`,
    ];

    if (account.cci) {
      messageLines.push(`CCI: ${account.cci}`);
    }

    messageLines.push("");
    messageLines.push(
      transaction.sbsRequired
        ? "⚠️ *Atención:* Por normativa SBS, adjunto mi voucher y el formulario firmado."
        : "📎 Adjunto mi voucher a continuación para proceder con el cambio.",
    );

    const message = messageLines.join("\n");
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }

  // ── Flujo del cliente ───────────────────────────────────

  async create(clerkId: string, dto: CreateTransactionDto) {
    const customer = await this.getCustomerOrThrow(clerkId);

    const account = await this.prisma.account.findUnique({
      where: { id: dto.accountId },
    });
    if (!account) throw new NotFoundException("Cuenta no encontrada.");
    if (account.customerId !== customer.id) {
      throw new ForbiddenException("Esta cuenta no te pertenece.");
    }

    const transaction = await this.prisma.transaction.create({
      data: {
        customerId: customer.id,
        accountId: account.id,
        sentCurrency: dto.sentCurrency,
        sentAmount: dto.sentAmount,
        receivedCurrency: dto.receivedCurrency,
        receivedAmount: dto.receivedAmount,
        exchangeRate: dto.exchangeRate,
        status: TransactionStatus.PENDING,
        sbsRequired: dto.sbsRequired ?? false,
      },
      include: { account: true },
    });

    return {
      transaction,
      whatsappUrl: await this.buildWhatsappUrl(transaction, account),
    };
  }

  async findMine(clerkId: string) {
    const customer = await this.getCustomerOrThrow(clerkId);
    return this.prisma.transaction.findMany({
      where: { customerId: customer.id },
      include: { account: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOneMine(clerkId: string, id: string) {
    const customer = await this.getCustomerOrThrow(clerkId);
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: { account: true },
    });
    if (!transaction) throw new NotFoundException("Transacción no encontrada.");
    if (transaction.customerId !== customer.id) {
      throw new ForbiddenException("Esta transacción no te pertenece.");
    }
    return transaction;
  }

  // ── Uso administrativo (CMS) ────────────────────────────

  async findAllAdmin() {
    return this.prisma.transaction.findMany({
      include: { account: true, customer: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateStatusAdmin(id: string, dto: UpdateTransactionStatusDto) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
    });
    if (!transaction) throw new NotFoundException("Transacción no encontrada.");
    return this.prisma.transaction.update({ where: { id }, data: dto });
  }
}
