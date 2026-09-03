-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "showVideoSection" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "videoSectionSubtitle" TEXT,
ADD COLUMN     "videoSectionTitle" TEXT;
