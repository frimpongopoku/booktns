import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { apiServer } from "@/lib/api-client.server";
import VideosClient from "@/components/dashboard/VideosClient";
import type { VendorVideo } from "@/types";

interface DashboardContext {
  vendor: { showVideoSection: boolean; videoSectionTitle: string | null; videoSectionSubtitle: string | null };
}

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

  // dashboard-context (open to any role) carries just the three
  // video-section fields this page needs — GET /vendor itself is
  // Owner-only, and Management can reach this page too.
  const [{ videos }, { vendor }] = await Promise.all([
    apiServer<{ videos: VendorVideo[] }>("/videos"),
    apiServer<DashboardContext>("/vendor/dashboard-context"),
  ]);

  return (
    <VideosClient
      initialVideos={videos}
      vendor={{
        showVideoSection: vendor.showVideoSection,
        videoSectionTitle: vendor.videoSectionTitle ?? undefined,
        videoSectionSubtitle: vendor.videoSectionSubtitle ?? undefined,
      }}
      canEditSection={session.role === "Owner"}
    />
  );
}
