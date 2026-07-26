-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductImage_productId_idx" ON "ProductImage"("productId");

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: carry forward any existing single Product.imageUrl into the new
-- ProductImage table (as the first/only image) before the column is dropped.
INSERT INTO "ProductImage" ("id", "productId", "url", "displayOrder")
SELECT gen_random_uuid()::text, "id", "imageUrl", 0
FROM "Product"
WHERE "imageUrl" IS NOT NULL;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "imageUrl";

-- AlterTable
ALTER TABLE "Media" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
