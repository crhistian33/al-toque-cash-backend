-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SettingKey" ADD VALUE 'PHONE_NUMBER';
ALTER TYPE "SettingKey" ADD VALUE 'ADDRESS';
ALTER TYPE "SettingKey" ADD VALUE 'SCHEDULE_1';
ALTER TYPE "SettingKey" ADD VALUE 'SCHEDULE_2';
ALTER TYPE "SettingKey" ADD VALUE 'FOOTER_DESCRIPTION';
ALTER TYPE "SettingKey" ADD VALUE 'LOGO_URL';
