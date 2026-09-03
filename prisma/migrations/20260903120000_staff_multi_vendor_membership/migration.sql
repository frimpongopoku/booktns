-- Staff.email is no longer globally unique: one person can be staff at
-- several vendors (a stylist working two salons, an owner running two
-- shops). Identity is the email; the membership is (vendorId, email).
DROP INDEX "Staff_email_key";

-- One membership per person per vendor. The same email can now exist at
-- many shops, but never twice at the same one.
CREATE UNIQUE INDEX "Staff_vendorId_email_key" ON "Staff"("vendorId", "email");

-- Sign-in looks every membership up by email, so that lookup needs an index
-- of its own now that the unique constraint no longer provides one.
CREATE INDEX "Staff_email_idx" ON "Staff"("email");
