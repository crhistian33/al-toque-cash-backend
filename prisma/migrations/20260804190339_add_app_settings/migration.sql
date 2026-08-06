-- CreateEnum
CREATE TYPE "SettingKey" AS ENUM ('EXCHANGE_RATE_BUY_MARGIN', 'EXCHANGE_RATE_SELL_MARGIN', 'WHATSAPP_NUMBER');

-- CreateTable
CREATE TABLE "app_settings" (
    "id" TEXT NOT NULL,
    "key" "SettingKey" NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_settings_key_key" ON "app_settings"("key");
