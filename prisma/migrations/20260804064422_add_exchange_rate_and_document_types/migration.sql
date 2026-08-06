-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('DNI', 'RUC');

-- CreateEnum
CREATE TYPE "ExchangeRateSource" AS ENUM ('SBS_API', 'MANUAL');

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "documentNumber" TEXT,
ADD COLUMN     "documentType" "DocumentType";

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "sbsRequired" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" TEXT NOT NULL,
    "buyRate" DECIMAL(8,4) NOT NULL,
    "sellRate" DECIMAL(8,4) NOT NULL,
    "source" "ExchangeRateSource" NOT NULL DEFAULT 'SBS_API',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exchange_rates_createdAt_idx" ON "exchange_rates"("createdAt");
