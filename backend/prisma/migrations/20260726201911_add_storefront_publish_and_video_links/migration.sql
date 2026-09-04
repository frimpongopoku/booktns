-- CreateEnum
CREATE TYPE "StorefrontDisplayMode" AS ENUM ('All', 'FeaturedOnly', 'AllWithFeaturedHighlighted');

-- AlterTable: Vendor gains a real publish gate + home-page display mode
ALTER TABLE "Vendor" ADD COLUMN "storefrontPublished" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Vendor" ADD COLUMN "storefrontDisplayMode" "StorefrontDisplayMode" NOT NULL DEFAULT 'All';

-- Clean up stale seed rows that predate the "external link" video model —
-- these were placeholder demo entries with no real url, which is now the
-- whole point of a VendorVideo row.
DELETE FROM "VendorVideo" WHERE "url" IS NULL;

-- AlterTable: VendorVideo — url is now required (external link), duration is
-- optional cosmetic info, displayOrder added for consistency with other
-- vendor-manageable lists.
ALTER TABLE "VendorVideo" ALTER COLUMN "durationSeconds" DROP NOT NULL;
ALTER TABLE "VendorVideo" ALTER COLUMN "url" SET NOT NULL;
ALTER TABLE "VendorVideo" ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;
