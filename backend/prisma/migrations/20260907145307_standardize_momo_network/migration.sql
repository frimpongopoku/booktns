-- CreateEnum
CREATE TYPE "MobileNetwork" AS ENUM ('MTN', 'Telecel', 'AirtelTigo');

-- Converts PaymentMethod.network from free text to the enum above. Hand-
-- written rather than Prisma-generated: the generator's default for this
-- kind of type change is to drop and recreate the column (real data loss),
-- since it has no way to know how to map arbitrary existing text onto the
-- new enum. This USING clause does that mapping instead — matching common
-- historical spellings, including "Vodafone" (Vodafone Ghana rebranded to
-- Telecel in 2023, so older rows may still say the old name) — and falls
-- back to NULL for anything unrecognized rather than guessing wrong or
-- blocking the migration. A NULL just means the vendor picks the real
-- network from the new dropdown next time they open Settings.
ALTER TABLE "PaymentMethod" ALTER COLUMN "network" TYPE "MobileNetwork" USING (
  CASE
    WHEN lower("network") LIKE 'mtn%' THEN 'MTN'
    WHEN lower("network") LIKE 'vodafone%' OR lower("network") LIKE 'telecel%' THEN 'Telecel'
    WHEN lower("network") LIKE 'airteltigo%' OR lower("network") LIKE 'airtel%tigo%' OR lower("network") LIKE 'tigo%' THEN 'AirtelTigo'
    ELSE NULL
  END
)::"MobileNetwork";
