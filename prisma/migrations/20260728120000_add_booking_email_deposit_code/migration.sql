-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "customerEmail" TEXT NOT NULL DEFAULT 'unknown@booktns.local';
ALTER TABLE "Booking" ALTER COLUMN "customerEmail" DROP DEFAULT;

ALTER TABLE "Booking" ADD COLUMN "depositReferenceCode" TEXT;

ALTER TABLE "Booking" DROP COLUMN "bookingRequestPdfUrl";

-- CreateIndex
CREATE UNIQUE INDEX "Booking_vendorId_depositReferenceCode_key" ON "Booking"("vendorId", "depositReferenceCode");
