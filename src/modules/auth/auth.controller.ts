import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { Webhook } from "svix";
import { AuthService } from "./auth.service";
import { ClerkAuthGuard } from "../../common/guards/clerk-auth.guard";
import { AdminAuthGuard } from "../../common/guards/admin-auth.guard";
import {
  CurrentUser,
  ClerkAuthPayload,
} from "../../common/decorators/current-user.decorator";
import { ClerkWebhookEvent } from "./dto/clerk-webhook.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Llamar desde el frontend (Astro) inmediatamente después de que Clerk
   * confirma el login/registro de un CLIENTE (onLoad del componente
   * <SignedIn> o en el callback de useUser()). Crea o actualiza el
   * Customer en la BD local. Si el token pertenece a un usuario staff
   * (public_metadata.isStaff), no crea nada y `customer` viene null.
   *
   * Header requerido: Authorization: Bearer <clerk session token>
   */
  @UseGuards(ClerkAuthGuard)
  @Post("sync")
  async sync(@CurrentUser() auth: ClerkAuthPayload) {
    const customer = await this.authService.syncFromClerk(auth.clerkId);
    return { customer };
  }

  /** Devuelve el cliente local autenticado actual (para pintar el header, etc). */
  @UseGuards(ClerkAuthGuard)
  @Get("me")
  async me(@CurrentUser() auth: ClerkAuthPayload) {
    const customer = await this.authService.getCustomerByClerkId(auth.clerkId);
    return { customer };
  }

  /** Devuelve el admin local autenticado (para el futuro CMS). */
  @UseGuards(ClerkAuthGuard, AdminAuthGuard)
  @Get("admin/me")
  async adminMe(@CurrentUser() auth: ClerkAuthPayload) {
    const admin = await this.authService.getAdminByClerkId(auth.clerkId);
    return { admin };
  }

  /**
   * Webhook de Clerk (user.created / user.updated / user.deleted).
   * Configúralo en el Dashboard de Clerk apuntando a:
   *   https://tu-backend.com/api/auth/webhook
   * y copia el "Signing Secret" a CLERK_WEBHOOK_SECRET.
   */
  @Post("webhook")
  @HttpCode(200)
  async webhook(
    @Req() req: Request,
    @Headers("svix-id") svixId: string,
    @Headers("svix-timestamp") svixTimestamp: string,
    @Headers("svix-signature") svixSignature: string,
    @Body() body: any,
  ) {
    const secret = process.env.CLERK_WEBHOOK_SECRET;
    if (!secret)
      throw new BadRequestException("CLERK_WEBHOOK_SECRET no configurado");
    if (!req.rawBody) {
      throw new BadRequestException(
        "rawBody no disponible; revisa main.ts (rawBody: true)",
      );
    }

    const wh = new Webhook(secret);
    let event: ClerkWebhookEvent;

    try {
      event = wh.verify(req.rawBody.toString("utf8"), {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as ClerkWebhookEvent;
    } catch (err) {
      throw new BadRequestException("Firma del webhook inválida");
    }

    await this.authService.upsertFromWebhookEvent(event);
    return { received: true };
  }
}
