"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/shared/Logo";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import OtpInput from "@/components/ui/OtpInput";
import { MessageCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!phone.trim()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setStep("otp");
  };

  const handleVerify = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    router.push("/dashboard");
  };

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

        {step === "phone" && (
          <div>
            <div className="text-center mb-8">
              <div
                className="w-12 h-12 rounded-[var(--r)] flex items-center justify-center mx-auto mb-4"
                style={{ background: "var(--ac-bg)" }}
              >
                <MessageCircle size={22} style={{ color: "var(--ac)" }} />
              </div>
              <h1
                className="font-display text-2xl font-medium mb-2"
                style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}
              >
                Sign in to Booktns
              </h1>
              <p className="text-sm" style={{ color: "var(--tx2)" }}>
                We&apos;ll send a 6-digit code to your WhatsApp.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <Input
                label="WhatsApp number"
                type="tel"
                placeholder="+234 800 000 0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                hint="Enter the number linked to your Booktns account"
              />
              <Button
                className="w-full"
                size="lg"
                loading={loading}
                onClick={handleSendOtp}
                disabled={!phone.trim()}
              >
                Send OTP via WhatsApp
              </Button>
            </div>
          </div>
        )}

        {step === "otp" && (
          <div>
            <div className="text-center mb-8">
              <div
                className="w-12 h-12 rounded-[var(--r)] flex items-center justify-center mx-auto mb-4"
                style={{ background: "var(--green-bg)" }}
              >
                <MessageCircle size={22} style={{ color: "var(--green)" }} />
              </div>
              <h1
                className="font-display text-2xl font-medium mb-2"
                style={{ fontFamily: "var(--font-display)", color: "var(--tx)" }}
              >
                Enter your code
              </h1>
              <p className="text-sm" style={{ color: "var(--tx2)" }}>
                We sent a 6-digit code to{" "}
                <span className="font-medium" style={{ color: "var(--tx)" }}>
                  {phone}
                </span>
              </p>
            </div>

            <div className="flex flex-col gap-6">
              <OtpInput value={otp} onChange={setOtp} />

              <Button
                className="w-full"
                size="lg"
                loading={loading}
                onClick={handleVerify}
                disabled={otp.some((d) => !d)}
              >
                Verify & Sign In
              </Button>

              <div className="text-center">
                <button
                  className="text-sm"
                  style={{ color: "var(--tx3)" }}
                  onClick={() => {
                    setStep("phone");
                    setOtp(Array(6).fill(""));
                  }}
                >
                  Use a different number
                </button>
                <span className="mx-2 text-xs" style={{ color: "var(--tx3)" }}>·</span>
                <button
                  className="text-sm font-medium"
                  style={{ color: "var(--ac)" }}
                  onClick={handleSendOtp}
                >
                  Resend code
                </button>
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-xs mt-10" style={{ color: "var(--tx3)" }}>
          Don&apos;t have an account?{" "}
          <a href="/onboarding" style={{ color: "var(--ac)" }} className="font-medium">
            Get started free
          </a>
        </p>
      </div>
    </div>
  );
}
