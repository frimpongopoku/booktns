-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ServiceCategory" ADD VALUE 'Makeup';
ALTER TYPE "ServiceCategory" ADD VALUE 'Barbering';
ALTER TYPE "ServiceCategory" ADD VALUE 'Waxing';
ALTER TYPE "ServiceCategory" ADD VALUE 'Massage';
