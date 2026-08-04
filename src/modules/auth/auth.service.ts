import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { createClerkClient } from "@clerk/backend";
import { AuthProvider, Customer } from "generated/prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { ClerkWebhookEvent } from "./dto/clerk-webhook.dto";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private clerkClient: ReturnType<typeof createClerkClient>;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  onModuleInit() {
    const secretKey = this.configService.get<string>("CLERK_SECRET_KEY");
    if (!secretKey) {
      throw new Error(
        "CLERK_SECRET_KEY no está definida en las variables de entorno",
      );
    }
    this.clerkClient = createClerkClient({ secretKey });
  }

  /**
   * Se llama desde /auth/sync justo después de que el usuario inicia
   * sesión o se registra en el frontend con Clerk. Trae el perfil
   * completo desde la API de Clerk y hace upsert en Customer.
   *
   * Si el usuario tiene `publicMetadata.isStaff === true` (marcado
   * manualmente desde el Dashboard de Clerk al invitar a alguien del
   * equipo), NO se crea como Customer: es staff y su sincronización
   * ocurre vía el webhook / alta manual como AdminUser.
   */
  async syncFromClerk(clerkId: string): Promise<Customer | null> {
    const clerkUser = await this.clerkClient.users.getUser(clerkId);

    if (clerkUser.publicMetadata?.isStaff === true) {
      this.logger.log(`Usuario ${clerkId} es staff, no se crea como Customer`);
      return null;
    }

    const primaryEmail = clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId,
    );

    const usedGoogle = clerkUser.externalAccounts?.some(
      (acc) => acc.provider === "oauth_google",
    );

    const authProvider = usedGoogle ? AuthProvider.GOOGLE : AuthProvider.EMAIL;

    return this.prisma.customer.upsert({
      where: { clerkId },
      update: {
        email: primaryEmail?.emailAddress ?? undefined,
        firstName: clerkUser.firstName ?? undefined,
        lastName: clerkUser.lastName ?? undefined,
        phone: clerkUser.phoneNumbers?.[0]?.phoneNumber ?? undefined,
        emailVerified: primaryEmail?.verification?.status === "verified",
      },
      create: {
        clerkId,
        email: primaryEmail?.emailAddress ?? `${clerkId}@sin-email.local`,
        firstName: clerkUser.firstName ?? undefined,
        lastName: clerkUser.lastName ?? undefined,
        phone: clerkUser.phoneNumbers?.[0]?.phoneNumber ?? undefined,
        authProvider,
        emailVerified: primaryEmail?.verification?.status === "verified",
      },
    });
  }

  /**
   * Alternativa recomendada para producción: Clerk llama a este webhook
   * (user.created / user.updated) apenas ocurre el evento, sin depender
   * de que el frontend haga la llamada de sync. Enruta a Customer o
   * AdminUser según `public_metadata.isStaff`.
   */
  async upsertFromWebhookEvent(event: ClerkWebhookEvent): Promise<void> {
    const isStaff = event.data.public_metadata?.isStaff === true;

    if (event.type === "user.deleted") {
      if (isStaff) {
        await this.prisma.adminUser
          .update({
            where: { clerkId: event.data.id },
            data: { isActive: false },
          })
          .catch(() =>
            this.logger.warn(
              `AdminUser ${event.data.id} no existía al eliminar`,
            ),
          );
      } else {
        await this.prisma.customer
          .update({
            where: { clerkId: event.data.id },
            data: { isActive: false },
          })
          .catch(() =>
            this.logger.warn(
              `Customer ${event.data.id} no existía al eliminar`,
            ),
          );
      }
      return;
    }

    if (event.type !== "user.created" && event.type !== "user.updated") return;

    const data = event.data;
    const primaryEmail = data.email_addresses.find(
      (e) => e.id === data.primary_email_address_id,
    );

    if (isStaff) {
      // El alta inicial del AdminUser (con su role ADMIN/SUPERADMIN) se
      // hace manualmente (Prisma Studio / seed / endpoint interno); el
      // webhook solo mantiene sincronizados nombre/email si cambian.
      await this.prisma.adminUser
        .update({
          where: { clerkId: data.id },
          data: {
            email: primaryEmail?.email_address ?? undefined,
            firstName: data.first_name ?? undefined,
            lastName: data.last_name ?? undefined,
          },
        })
        .catch(() =>
          this.logger.warn(
            `AdminUser ${data.id} marcado isStaff pero no existe en BD; créalo manualmente con su rol.`,
          ),
        );
      return;
    }

    const usedGoogle = data.external_accounts?.some(
      (acc) => acc.provider === "oauth_google",
    );

    await this.prisma.customer.upsert({
      where: { clerkId: data.id },
      update: {
        email: primaryEmail?.email_address ?? undefined,
        firstName: data.first_name ?? undefined,
        lastName: data.last_name ?? undefined,
        phone: data.phone_numbers?.[0]?.phone_number ?? undefined,
      },
      create: {
        clerkId: data.id,
        email: primaryEmail?.email_address ?? `${data.id}@sin-email.local`,
        firstName: data.first_name ?? undefined,
        lastName: data.last_name ?? undefined,
        phone: data.phone_numbers?.[0]?.phone_number ?? undefined,
        authProvider: usedGoogle ? AuthProvider.GOOGLE : AuthProvider.EMAIL,
      },
    });
  }

  async getCustomerByClerkId(clerkId: string): Promise<Customer | null> {
    return this.prisma.customer.findUnique({ where: { clerkId } });
  }

  async getAdminByClerkId(clerkId: string) {
    return this.prisma.adminUser.findUnique({ where: { clerkId } });
  }
}
