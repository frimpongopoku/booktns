"use server";

import { apiPublic, ApiError } from "@/lib/api-client";

interface BusinessInfoInput {
  name: string;
  slug: string;
  description: string;
  location: string;
  hours: string;
  phone: string;
}

interface StaffInput {
  name: string;
  email: string;
  role: string;
}

interface ServiceInput {
  name: string;
  duration: string;
  price: string;
  category: string;
}

interface PaymentMethodInput {
  type: string;
  label: string;
  number: string;
  name: string;
}

interface OnboardingInput {
  businessInfo: BusinessInfoInput;
  staffList: StaffInput[];
  services: ServiceInput[];
  paymentMethods: PaymentMethodInput[];
}

type OnboardingResult = { ok: true; slug: string } | { ok: false; error: string };

// Thin proxy to the NestJS API — see backend/src/modules/onboarding for the
// actual creation logic (Vendor + owner Staff + BusinessHours, in one
// transaction). This action's signature stays the same on purpose so
// app/onboarding/page.tsx needs no changes.
export async function createVendorFromOnboarding(input: OnboardingInput): Promise<OnboardingResult> {
  try {
    const { slug } = await apiPublic<{ slug: string }>("/onboarding", { method: "POST", body: input });
    return { ok: true, slug };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message };
    return { ok: false, error: "Something went wrong creating your account. Please try again." };
  }
}
