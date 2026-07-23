"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/shared/Logo";
import Button from "@/components/ui/Button";
import { ShieldCheck } from "lucide-react";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.348 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "redirecting" | "verifying">("idle");

  const handleGoogleSignIn = async () => {
    setStatus("redirecting");
    await new Promise((r) => setTimeout(r, 700));
    setStatus("verifying");
    await new Promise((r) => setTimeout(r, 700));
    router.push("/dashboard");
  };

  const loading = status !== "idle";
  const label =
    status === "redirecting"
      ? "Redirecting to Google…"
      : status === "verifying"
        ? "Verifying your account…"
        : "Continue with Google";

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-16"
      style={{ background: "var(--bg)" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Logo size="lg" href="/" />
        </div>

        <div className="text-center mb-8">
          <div
            className="w-12 h-12 rounded-[var(--r)] flex items-center justify-center mx-auto mb-4"
            style={{ background: "var(--ac-bg)" }}
          >
            <ShieldCheck size={22} style={{ color: "var(--ac)" }} />
          </div>
          <h1
            className="font-display text-2xl font-medium mb-2"
            style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}
          >
            Sign in to Booktns
          </h1>
          <p className="text-sm" style={{ color: "var(--tx2)" }}>
            Staff and vendor login. No password needed.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <Button
            variant="secondary"
            className="w-full"
            size="lg"
            loading={loading}
            onClick={handleGoogleSignIn}
          >
            {!loading && <GoogleIcon />}
            {label}
          </Button>
        </div>

        <p className="text-center text-xs mt-6 leading-relaxed" style={{ color: "var(--tx3)" }}>
          Only Google accounts added by your vendor owner can sign in.
        </p>

        <p className="text-center text-xs mt-10" style={{ color: "var(--tx3)" }}>
          Don&apos;t have an account?{" "}
          <Link href="/onboarding" style={{ color: "var(--ac)" }} className="font-medium">
            Get started free
          </Link>
        </p>
      </div>
    </div>
  );
}
