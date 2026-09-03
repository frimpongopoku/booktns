// Shared facts for the Privacy Policy and Terms of Service. Kept in one
// place because the two documents state the same things about the same
// company — an entity name or contact address that drifts between them is
// the kind of error that undermines both.

// Booktns is operated by the same company behind Selltns, so the operating
// entity, jurisdiction, and governing law match those documents.
export const OPERATING_ENTITY = "Biibisoft";
export const JURISDICTION = "Ghana";
export const DATA_PROTECTION_ACT = "Ghana's Data Protection Act, 2012 (Act 843)";

export const PRIVACY_EMAIL = "privacy@booktns.com";
export const LEGAL_EMAIL = "legal@booktns.com";

// Shown at the top of both documents. Update this whenever either changes
// materially — both documents tell readers that's how they can tell.
export const LEGAL_EFFECTIVE_DATE = "1 September 2026";

export interface LegalSection {
  id: string;
  title: string;
}
