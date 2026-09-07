-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "galleryDescription" TEXT,
ADD COLUMN     "galleryImageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "galleryTitle" TEXT;
