-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "confirmationPdfUrl" TEXT;

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "ownerEmail" TEXT,
ADD COLUMN     "ownerName" TEXT,
ADD COLUMN     "ownerPhone" TEXT,
ADD COLUMN     "showOwnerEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showOwnerName" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showOwnerPhone" BOOLEAN NOT NULL DEFAULT false;
