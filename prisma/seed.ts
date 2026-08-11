import 'dotenv/config';

import { AdminRole, ExchangeRateSource, SettingKey } from '../generated/prisma/client';
import { PrismaClient } from '../generated/prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Ejecutando seed...\n');

  // ── 1. Admin inicial ─────────────────────────────────────────────────────────
  // Reemplaza clerkId/email por los valores reales antes de correr en producción.
  await prisma.adminUser.upsert({
    where: { email: 'admin@altoquecash.pe' },
    update: {},
    create: {
      clerkId: 'user_admin_seed_placeholder',
      email: 'admin@altoquecash.pe',
      firstName: 'Admin',
      lastName: 'AlToqueCash',
      role: AdminRole.SUPERADMIN,
    },
  });
  console.log('✅ Admin inicial listo.');

  // ── 2. Configuraciones globales (AppSettings) ─────────────────────────────────
  const defaultSettings: Array<{ key: SettingKey; value: string }> = [
    // Márgenes en 0 — el operador los ajustará desde el panel de admin
    { key: SettingKey.EXCHANGE_RATE_BUY_MARGIN, value: '0' },
    { key: SettingKey.EXCHANGE_RATE_SELL_MARGIN, value: '0' },
    // Número de WhatsApp de atención al cliente (formato internacional)
    { key: SettingKey.WHATSAPP_NUMBER, value: '+51999999999' },
    // Datos de contacto y presentación
    { key: SettingKey.PHONE_NUMBER, value: '' },
    { key: SettingKey.ADDRESS, value: '' },         // vacío = sin dirección (null semántico)
    // Horarios de atención
    { key: SettingKey.SCHEDULE_1, value: '' },
    { key: SettingKey.SCHEDULE_2, value: '' },
    // Footer
    { key: SettingKey.FOOTER_DESCRIPTION, value: '' },
    { key: SettingKey.LOGO_URL, value: '' },        // vacío = sin logo configurado
    { key: SettingKey.COMPANY_BANK_ACCOUNTS, value: '[]' }, // JSON array de cuentas bancarias
  ];


  for (const setting of defaultSettings) {
    await prisma.appSetting.upsert({
      where: { key: setting.key },
      // update: {} — no sobreescribe si ya fue configurado por el admin
      update: {},
      create: setting,
    });
  }
  console.log('✅ Configuraciones globales listas.');

  // ── 3. Tasa de cambio inicial ────────────────────────────────────────────────
  // Evita el NotFoundException en getLatest() hasta que corra el primer cron.
  // Solo se crea si la tabla está completamente vacía.
  const existingRate = await prisma.exchangeRate.findFirst();
  if (!existingRate) {
    await prisma.exchangeRate.create({
      data: {
        buyRate: 3.70,
        sellRate: 3.75,
        source: ExchangeRateSource.SBS_API,
      },
    });
    console.log('✅ Tasa de cambio inicial creada (compra 3.70 / venta 3.75).');
  } else {
    console.log('ℹ️  Ya existe una tasa de cambio, se omitió el seed de tasa.');
  }

  console.log('\n🎉 Seed ejecutado correctamente.');
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    pool.end();
  });
