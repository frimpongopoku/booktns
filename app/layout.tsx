import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";

export const metadata: Metadata = {
  title: "Booktns — Beauty Booking for Vendors",
  description: "The all-in-one booking and order management platform for beauty service vendors.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col" style={{ background: "var(--bg)", color: "var(--tx)" }}>
        <NextTopLoader color="#B85C4A" height={2} showSpinner={false} />
        {children}
      </body>
    </html>
  );
}
