-- CreateEnum
CREATE TYPE "HeroCardMode" AS ENUM ('CoverImage', 'Gallery', 'Video');

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "heroCardMode" "HeroCardMode" NOT NULL DEFAULT 'CoverImage',
ADD COLUMN     "heroGalleryUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "heroVideoId" TEXT;
