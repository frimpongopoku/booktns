import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { apiServer } from "@/lib/api-client.server";
import MediaClient from "@/components/dashboard/MediaClient";
import type { Media } from "@/types";

export default async function MediaPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.role === "Service") {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 py-16 rounded-[var(--rl)] text-center"
        style={{ background: "var(--bg2)", border: "1px dashed var(--bds)" }}
      >
        <p className="text-sm font-medium" style={{ color: "var(--tx)" }}>You don&apos;t have access to this page</p>
        <p className="text-xs max-w-xs" style={{ color: "var(--tx3)" }}>
          Managing media is limited to owners and management staff.
        </p>
      </div>
    );
  }

  const { media, nextCursor } = await apiServer<{ media: Media[]; nextCursor: string | null }>("/media");

  return <MediaClient initialMedia={media} initialNextCursor={nextCursor} />;
}
