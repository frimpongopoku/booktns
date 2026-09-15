-- Many customers only have a phone number, not an email — see CLAUDE.md
-- data rules. Existing rows already carry a real or placeholder email, so
-- this is additive-safe: just drops the NOT NULL constraint, no data change.
ALTER TABLE "Booking" ALTER COLUMN "customerEmail" DROP NOT NULL;
