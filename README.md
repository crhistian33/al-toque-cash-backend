# AL TOQUE CA$H — Backend (NestJS + Prisma 7 + Postgres + Clerk)

## 1. Instalación

```bash
npm install
cp .env.example .env   # completa DATABASE_URL, CLERK_SECRET_KEY, CLERK_WEBHOOK_SECRET
npx prisma generate
npx prisma migrate dev --name init
npm run start:dev
```

La API queda en `http://localhost:3000/api`.

## 2. Customer vs. AdminUser

Son dos modelos separados a propósito, no un `User` único con `role`:

- **`Customer`**: se auto-registra desde el sitio público vía Clerk (email
  o Google). Tiene `accounts` y `transactions`.
- **`AdminUser`**: staff del futuro CMS, con `role` (`ADMIN` /
  `SUPERADMIN`). Nunca se crea desde el flujo de registro público — se da
  de alta a mano (Prisma Studio, seed, o un endpoint interno) y se
  identifica en Clerk marcando `publicMetadata.isStaff = true` desde el
  Dashboard (o vía API al invitarlo).

`AuthService.syncFromClerk` revisa ese `publicMetadata` antes de crear un
`Customer`: si el usuario es staff, no crea nada ahí (el alta de
`AdminUser` es manual, ligada a su rol). El webhook (`/auth/webhook`)
sigue la misma regla para mantener ambos sincronizados con Clerk sin
mezclarlos en una sola tabla.

`AdminAuthGuard` (en vez de un `RolesGuard` sobre un campo `role` de un
`User` genérico) consulta directamente la tabla `AdminUser`: si la
persona no fue invitada como staff, no existe ahí y se le niega el acceso
aunque tenga una sesión de Clerk válida como cliente.

## 3. Sobre las contraseñas y Clerk (importante)

Clerk es tu proveedor de identidad y gestiona las contraseñas de forma
segura (hash, rotación, 2FA, etc.) en su propia infraestructura. Tu
backend nunca ve ni necesita la contraseña — solo verifica el JWT de
sesión que Clerk emite. Guardar el password en tu BD sería un riesgo de
seguridad y una fuente de datos duplicada/desincronizada sin ningún
beneficio. En su lugar, `Customer.authProvider` (`EMAIL` | `GOOGLE`)
guarda **con qué método se registró**, que es el dato realmente útil.

## 4. Flujo completo

1. **Frontend (Astro 5)**: el header y el botón "Cambiar ahora" del Hero
   abren el modal/página de Clerk (`<SignIn />` / `<SignUp />`, o
   `clerk.openSignIn()` desde JS). Clerk permite email+password o Google
   de forma nativa, sin configuración extra en el backend salvo habilitar
   el proveedor Google en el Dashboard de Clerk.
2. **Al completar login/registro**, el frontend llama:
   ```js
   const token = await window.Clerk.session.getToken();
   await fetch(`${API_URL}/api/auth/sync`, {
     method: 'POST',
     headers: { Authorization: `Bearer ${token}` },
   });
   ```
   Esto crea o actualiza el `Customer` en Postgres (detecta
   automáticamente si fue Google u email revisando `externalAccounts` de
   Clerk, y omite la creación si el usuario es staff).
3. **Alternativa/respaldo recomendado para producción**: configura el
   webhook de Clerk (`user.created`, `user.updated`, `user.deleted`)
   apuntando a `POST /api/auth/webhook`. Así el usuario se sincroniza en
   tu BD aunque el frontend no llegue a llamar `/auth/sync` (por ejemplo
   si cierra la pestaña justo después de registrarse).
4. **Header con usuario logueado**: el frontend usa `<SignedIn>` /
   `useUser()` de `@clerk/astro` (o el SDK que uses) para pintar el
   componente de usuario; no depende del backend para eso, Clerk maneja
   la sesión en el cliente.
5. **"Cambiar ahora"**: si no hay sesión, abre Clerk. Si ya hay sesión,
   navega a la página de cambio. Ahí el frontend llama:
   ```
   GET /api/accounts/mine?currency=USD
   ```
   - Si devuelve cuentas → se listan en un `<select>`.
   - Si devuelve `[]` → se muestra el botón "Añadir cuenta" que abre un
     form con `POST /api/accounts` (`currency`, `bank`, `accountNumber`,
     `cci`, `accountHolderName`).
6. **Confirmar el cambio**: `POST /api/transactions` con el monto, moneda
   origen/destino, tasa aplicada y `accountId` elegido. Se crea con
   `status: PENDING` y la respuesta incluye `whatsappUrl`, ya armado con
   el mensaje (monto, moneda, cuenta destino) para que el botón de la
   página de éxito solo haga `window.open(whatsappUrl)` y el cliente
   adjunte el voucher manualmente en el chat.

## 5. Endpoints

| Método | Ruta                          | Auth        | Descripción |
|--------|-------------------------------|-------------|-------------|
| POST   | /api/auth/sync                 | Clerk       | Upsert del Customer logueado desde Clerk (no-op si es staff) |
| GET    | /api/auth/me                   | Clerk       | Customer local actual |
| GET    | /api/auth/admin/me              | Clerk+Admin | AdminUser local actual (CMS) |
| POST   | /api/auth/webhook               | svix        | Webhook de Clerk (user.created/updated/deleted) |
| GET    | /api/customers/me                | Clerk       | Perfil + cuentas del cliente |
| PATCH  | /api/customers/me                | Clerk       | Editar nombre/teléfono |
| GET    | /api/customers                    | Admin       | Listado de clientes (CMS) |
| GET    | /api/accounts/mine?currency=      | Clerk       | Cuentas propias, filtrables por moneda |
| POST   | /api/accounts                     | Clerk       | Añadir cuenta bancaria |
| PATCH  | /api/accounts/:id                 | Clerk       | Editar cuenta propia |
| DELETE | /api/accounts/:id                 | Clerk       | Desactivar cuenta propia |
| POST   | /api/transactions                  | Clerk       | Crear solicitud de cambio (PENDING) + link WhatsApp |
| GET    | /api/transactions/mine              | Clerk       | Historial propio |
| GET    | /api/transactions/mine/:id          | Clerk       | Detalle propio |
| GET    | /api/transactions                   | Admin       | Listado global (CMS) |
| PATCH  | /api/transactions/:id/status        | Admin       | Cambiar estado (CMS) |

Todas las rutas requieren `Authorization: Bearer <token de sesión de
Clerk>`. Las marcadas "Admin" además requieren que ese `clerkId` exista
en la tabla `AdminUser` (ver `AdminAuthGuard`).

## 6. Modelo de datos (resumen)

- **Customer**: identidad sincronizada desde Clerk (`clerkId` único),
  cuentas y transacciones.
- **AdminUser**: staff del CMS, separado de `Customer`, con `role`
  (`ADMIN` / `SUPERADMIN`).
- **Account**: cuentas bancarias del cliente, una por combinación
  `(customerId, currency, accountNumber)` — permite tener cuenta en USD y
  en PEN a la vez.
- **Transaction**: cada operación de cambio, con `status`
  (`PENDING → IN_REVIEW → COMPLETED` o `CANCELLED/REJECTED`).

## 7. Dar de alta a un admin

1. Invita a la persona en el Dashboard de Clerk (o que se registre) y
   marca `publicMetadata.isStaff = true` en su perfil de Clerk.
2. Crea su fila en `AdminUser` con su `clerkId` real y el `role` que le
   corresponda (edita `prisma/seed.ts` o usa `npx prisma studio`).
3. A partir de ahí, `AdminAuthGuard` le da acceso a los endpoints de CMS
   usando el mismo login de Clerk que ya tiene.
