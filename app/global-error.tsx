"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import "./globals.css";

// Mirrors app/layout.tsx's inline theme script. global-error replaces the
// entire root layout (including <html>/<head>), so it never inherits that
// script — without redeclaring it here, this page always renders in light
// mode regardless of the user's stored/system preference.
const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('booktns-theme');
    var s = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t || s);
  } catch(e) {}
})();
`;

// Only fires for errors thrown by the root layout itself — every other
// error is caught by a normal error.tsx boundary lower in the tree. Must
// render its own <html>/<body> since it replaces the root layout entirely.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body style={{ background: "var(--bg)", color: "var(--tx)", fontFamily: "var(--font-body, system-ui, sans-serif)" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            textAlign: "center",
            gap: "12px",
          }}
        >
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Something went wrong on our end</h1>
          <p style={{ color: "var(--tx2)", maxWidth: "360px" }}>
            We&apos;ve been notified and are looking into it. Try refreshing the page — if it keeps happening, please reach out to your Booktns contact.
          </p>
          <button
            // A plain reset() re-renders the same already-erroring tree in
            // place — if the failure is deterministic (a down dependency, a
            // bad deploy) it re-throws immediately and looks like the
            // button did nothing. A full reload always visibly does
            // something and is the only way to recover from state a soft
            // reset can't touch (e.g. a bad module-level singleton).
            onClick={() => window.location.reload()}
            style={{
              marginTop: "8px",
              padding: "8px 16px",
              borderRadius: "var(--r, 8px)",
              background: "var(--ac)",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
