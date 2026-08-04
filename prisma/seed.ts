import { PrismaClient, AdminRole } from "generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Crea un admin inicial. Reemplaza clerkId/email por uno real de tu
  // dashboard de Clerk (usuario invitado como staff) antes de correr
  // el seed en producción.
  await prisma.adminUser.upsert({
    where: { email: "admin@altoquecash.pe" },
    update: {},
    create: {
      clerkId: "user_admin_seed_placeholder",
      email: "admin@altoquecash.pe",
      firstName: "Admin",
      lastName: "AlToqueCash",
      role: AdminRole.SUPERADMIN,
    },
  });

  console.log("Seed ejecutado correctamente.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
