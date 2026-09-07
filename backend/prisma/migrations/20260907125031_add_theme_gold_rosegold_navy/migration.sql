-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StorefrontTheme" ADD VALUE 'Gold';
ALTER TYPE "StorefrontTheme" ADD VALUE 'RoseGold';
ALTER TYPE "StorefrontTheme" ADD VALUE 'Navy';
