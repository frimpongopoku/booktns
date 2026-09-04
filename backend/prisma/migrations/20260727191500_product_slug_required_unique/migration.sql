-- Drop the temporary empty-string default now that every existing row has
-- been backfilled with a real slug, then enforce per-vendor uniqueness.
ALTER TABLE "Product" ALTER COLUMN "slug" DROP DEFAULT;

CREATE UNIQUE INDEX "Product_vendorId_slug_key" ON "Product"("vendorId", "slug");
