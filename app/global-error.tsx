"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import "./globals.css";

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
    <html lang="en">
      <body style={{ background: "#FAFAFA", color: "#141413", fontFamily: "system-ui, sans-serif" }}>
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
          <p style={{ color: "#6B7280", maxWidth: "360px" }}>
            We&apos;ve been notified and are looking into it. Try refreshing the page — if it keeps happening, please reach out to your Booktns contact.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "8px",
              padding: "8px 16px",
              borderRadius: "8px",
              background: "#C0283A",
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
