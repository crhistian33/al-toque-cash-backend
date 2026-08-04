/**
 * Forma simplificada del payload que envía Clerk en los eventos
 * user.created / user.updated. No se valida con class-validator porque
 * la integridad se garantiza con la firma svix (ver auth.controller.ts).
 */
export interface ClerkWebhookEvent {
  type: 'user.created' | 'user.updated' | 'user.deleted' | string;
  data: {
    id: string;
    email_addresses: { id: string; email_address: string }[];
    primary_email_address_id: string;
    first_name: string | null;
    last_name: string | null;
    phone_numbers?: { phone_number: string }[];
    external_accounts?: { provider: string }[];
    /**
     * `public_metadata.isStaff: true` marca a un usuario como parte del
     * equipo interno (admin del CMS). Se setea manualmente desde el
     * Dashboard de Clerk o vía API al invitar a alguien del equipo —
     * nunca lo puede setear el propio usuario desde el sitio público.
     */
    public_metadata?: { isStaff?: boolean; [key: string]: unknown };
  };
}
