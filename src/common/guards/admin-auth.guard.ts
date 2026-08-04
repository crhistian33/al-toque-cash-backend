import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../../prisma/prisma.service";
import { AdminRole } from "generated/prisma/enums";

export const ADMIN_ROLES_KEY = "adminRoles";
/** Restringe además por rol específico, ej: @AdminRoles(AdminRole.SUPERADMIN) */
export const AdminRoles = (...roles: AdminRole[]) =>
  SetMetadata(ADMIN_ROLES_KEY, roles);

/**
 * Guard para endpoints del futuro CMS. Debe usarse SIEMPRE después de
 * ClerkAuthGuard (depende de request.clerkAuth para saber quién es).
 *
 * A diferencia de un simple check de `role` sobre el usuario, esto
 * consulta la tabla AdminUser: si la persona no fue invitada como staff,
 * no existe ahí y el acceso se rechaza aunque tenga sesión válida de
 * Clerk como cliente.
 */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const clerkId = request.clerkAuth?.clerkId;
    if (!clerkId) throw new ForbiddenException("No autenticado");

    const admin = await this.prisma.adminUser.findUnique({
      where: { clerkId },
    });
    if (!admin || !admin.isActive) {
      throw new ForbiddenException(
        "No tienes acceso al panel de administración",
      );
    }

    const requiredRoles = this.reflector.getAllAndOverride<AdminRole[]>(
      ADMIN_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (requiredRoles?.length && !requiredRoles.includes(admin.role)) {
      throw new ForbiddenException("No tienes permisos para esta acción");
    }

    request.adminUser = admin;
    return true;
  }
}
