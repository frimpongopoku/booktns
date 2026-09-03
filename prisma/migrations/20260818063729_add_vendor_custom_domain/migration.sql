/*
  Warnings:

  - A unique constraint covering the columns `[customDomain]` on the table `Vendor` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "customDomain" TEXT,
ADD COLUMN     "customDomainVerified" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_customDomain_key" ON "Vendor"("customDomain");
