import { BadgeCheck } from "lucide-react";

interface VerifiedBadgeProps {
  size?: number;
  showLabel?: boolean;
}

// Shown wherever a vendor's identity is asserted. The title matters: a badge
// nobody can interpret is decoration, not a trust signal.
export default function VerifiedBadge({ size = 15, showLabel = false }: VerifiedBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1 align-middle"
      title="Booktns has verified this vendor's identity."
      style={{ color: "var(--green)" }}
    >
      <BadgeCheck size={size} aria-hidden={showLabel ? "true" : undefined} />
      {showLabel ? (
        <span className="text-xs font-medium">Verified</span>
      ) : (
        <span className="sr-only">Verified vendor</span>
      )}
    </span>
  );
}
