import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface ClerkAuthPayload {
  clerkId: string;
  sessionClaims: Record<string, any>;
}

/**
 * Extrae el auth de Clerk adjuntado por ClerkAuthGuard.
 * Uso: findMe(@CurrentUser() auth: ClerkAuthPayload)
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): ClerkAuthPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.clerkAuth;
  },
);
