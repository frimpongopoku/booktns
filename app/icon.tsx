import { renderIconMark } from "@/lib/og-image";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return renderIconMark({ size: 32 });
}
