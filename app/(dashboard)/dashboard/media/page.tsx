import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeMedia } from "@/lib/serialize";
import MediaClient from "@/components/dashboard/MediaClient";

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

  // Keep in sync with PAGE_SIZE in app/api/media/route.ts — this is the same
  // first page the client would get from GET /api/media, fetched directly to
  // avoid a redundant round-trip on initial page load.
  const PAGE_SIZE = 24;
  const page = await db.media.findMany({
    where: { vendorId: session.vendorId },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
  });
  const hasMore = page.length > PAGE_SIZE;
  const media = page.slice(0, PAGE_SIZE);
  const nextCursor = hasMore ? media[media.length - 1].id : null;

  return <MediaClient initialMedia={media.map(serializeMedia)} initialNextCursor={nextCursor} />;
}
