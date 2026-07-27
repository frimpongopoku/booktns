-- CreateEnum
CREATE TYPE "OrderDeliveryPreference" AS ENUM ('Pickup', 'Delivery');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryPreference" "OrderDeliveryPreference" NOT NULL DEFAULT 'Pickup',
ADD COLUMN     "notes" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "paymentMethodId" TEXT;

-- CreateIndex
CREATE INDEX "Order_paymentMethodId_idx" ON "Order"("paymentMethodId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
