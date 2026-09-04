-- CreateEnum
CREATE TYPE "StorefrontTheme" AS ENUM ('Red', 'Emerald', 'Indigo', 'Orchid');

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "storefrontTheme" "StorefrontTheme" NOT NULL DEFAULT 'Red';
