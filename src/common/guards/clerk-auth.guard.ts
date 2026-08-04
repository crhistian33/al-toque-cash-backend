import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { verifyToken } from "@clerk/backend";

/**
 * Verifica el JWT de Clerk enviado por el frontend (Astro) en el header
 * `Authorization: Bearer <token>`. Si es válido, adjunta el payload a
 * `request.clerkAuth` para que los controllers/servicios lo usen.
 *
 * El frontend obtiene el token con `await window.Clerk.session.getToken()`
 * (o el helper `auth().getToken()` si se usa el SDK de servidor de Astro).
 */
@Injectable()
export class ClerkAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("Token de Clerk no enviado");
    }

    const token = authHeader.substring("Bearer ".length);

    try {
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });

      // payload.sub es el clerkId (user_xxx)
      request.clerkAuth = {
        clerkId: payload.sub,
        sessionClaims: payload,
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException("Token de Clerk inválido o expirado");
    }
  }
}
