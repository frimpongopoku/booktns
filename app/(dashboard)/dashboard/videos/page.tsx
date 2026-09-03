import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeVendorVideo, serializeVendor } from "@/lib/serialize";
import VideosClient from "@/components/dashboard/VideosClient";

export default async function VideosPage() {
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
          Managing videos is limited to owners and management staff.
        </p>
      </div>
    );
  }

  const [videos, vendor] = await Promise.all([
    db.vendorVideo.findMany({
      where: { vendorId: session.vendorId },
      orderBy: { displayOrder: "asc" },
    }),
    db.vendor.findUnique({ where: { id: session.vendorId } }),
  ]);

  if (!vendor) redirect("/login");

  return <VideosClient initialVideos={videos.map(serializeVendorVideo)} vendor={serializeVendor(vendor)} canEditSection={session.role === "Owner"} />;
}
