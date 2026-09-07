"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithPopup, signInWithRedirect, getRedirectResult, signOut, type AuthError } from "firebase/auth";
import { getFirebaseAuth, getFirebaseAuthReady, googleProvider } from "@/lib/firebase-client";
import Button from "@/components/ui/Button";
import { ShieldAlert, AlertCircle } from "lucide-react";

interface ApiErrorBody {
  error: string;
  code: string;
}

// Standalone sign-in for the platform console. Visually distinct from the
// vendor login on purpose — see the superadmin-scope theme note in
// components/superadmin/SuperAdminShell.tsx.
export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "signing-in" | "verifying">("idle");
  const [error, setError] = useState<string | null>(null);

  // Shared by both sign-in paths below — a Google ID token in hand, either
  // from a popup that resolved directly or from a redirect round trip.
  const completeSignIn = async (idToken: string) => {
    setStatus("verifying");
    try {
      const res = await fetch("/api/superadmin/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
        // Sign out of Firebase too — leaving a Google session attached to an
        // account the console rejected makes the next attempt confusing.
        await signOut(getFirebaseAuth()).catch(() => {});
        setStatus("idle");
        setError(body?.error ?? "Something went wrong. Please try again.");
        return;
      }

      router.replace("/superadmin");
      router.refresh();
    } catch {
      setStatus("idle");
      setError("Couldn't reach the server. Check your connection and try again.");
    }
  };

  // Safari — especially iOS Safari — routinely blocks signInWithPopup
  // outright (auth/popup-blocked) rather than letting it open. On that one
  // error (and auth/operation-not-supported-in-this-environment, the same
  // failure inside some in-app browsers), fall back to a full-page
  // signInWithRedirect instead of just failing — the effect below picks the
  // result back up once the browser returns to this page.
  const POPUP_UNAVAILABLE_CODES = new Set(["auth/popup-blocked", "auth/operation-not-supported-in-this-environment"]);

  const handleGoogleSignIn = async () => {
    setError(null);
    setStatus("signing-in");

    // Sets browserLocalPersistence before the popup opens — Firebase's
    // default IndexedDB-backed persistence has a real SDK bug where a
    // second tab (or any concurrent connection) can force-close the
    // IndexedDB connection mid-write, silently dropping the sign-in right
    // after Google's OAuth handshake has already succeeded: the popup
    // closes normally, no error surfaces, and the page just sits there.
    // See lib/firebase-client.ts. The vendor /login page already carries
    // this fix; this page just never got it.
    const auth = await getFirebaseAuthReady();
    let idToken: string;
    try {
      const result = await signInWithPopup(auth, googleProvider);
      idToken = await result.user.getIdToken();
    } catch (err) {
      const code = (err as AuthError).code;

      if (POPUP_UNAVAILABLE_CODES.has(code)) {
        // Navigates the whole page away to Google — nothing after this call
        // runs.
        await signInWithRedirect(auth, googleProvider);
        return;
      }

      setStatus("idle");
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        setError("Something went wrong signing in with Google. Please try again.");
      }
      return;
    }

    await completeSignIn(idToken);
  };

  // Picks up a sign-in that finished via the redirect fallback above — a
  // no-op (resolves to null) on every ordinary page load.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await getRedirectResult(await getFirebaseAuthReady());
        if (!result || cancelled) return;
        const idToken = await result.user.getIdToken();
        if (!cancelled) await completeSignIn(idToken);
      } catch {
        if (cancelled) return;
        setError("Something went wrong signing in with Google. Please try again.");
        setStatus("idle");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- completeSignIn is recreated every render; including it would re-run this on every render for no reason. It only closes over `router` (stable) and state setters (always stable).
  }, []);

  return (
    <div className="dark superadmin-scope min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-8">
          <div
            className="w-14 h-14 rounded-[var(--rl)] flex items-center justify-center mb-4"
            style={{ background: "var(--ac-bg)", border: "1px solid var(--ac)" }}
          >
            <ShieldAlert size={24} style={{ color: "var(--ac)" }} />
          </div>
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-2"
            style={{ color: "var(--ac)", fontFamily: "ui-monospace, monospace" }}
          >
            Superadmin
          </p>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--tx)" }}>
            Platform console
          </h1>
          <p className="text-sm mt-2" style={{ color: "var(--tx3)" }}>
            Restricted to Booktns platform administrators.
          </p>
        </div>

        {error && (
          <div
            className="flex items-start gap-2.5 px-3 py-2.5 rounded-[var(--r)] mb-4"
            style={{ background: "rgba(185,28,28,0.12)", color: "#FCA5A5" }}
          >
            <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <Button
          className="w-full"
          size="lg"
          loading={status !== "idle"}
          onClick={handleGoogleSignIn}
        >
          {status === "verifying" ? "Checking access…" : "Continue with Google"}
        </Button>

        <p className="text-xs text-center mt-6" style={{ color: "var(--tx3)" }}>
          Access is granted by invitation only. There is no sign-up.
        </p>
      </div>
    </div>
  );
}
