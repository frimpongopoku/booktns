import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

// Anyone already signed in has no business on /login — send them to the
// dashboard instead of showing a sign-in form they'd bounce straight back
// from. Done at the layout so it covers every route in the group, and
// server-side so it happens before the page renders rather than as a flash
// of the login form followed by a client-side redirect.
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return <>{children}</>;
}
