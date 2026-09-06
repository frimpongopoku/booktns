import type { Metadata, Viewport } from "next";
import NextTopLoader from "nextjs-toploader";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import AnalyticsProvider from "@/components/shared/AnalyticsProvider";
import "./globals.css";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:2665";
const SITE_NAME = "Booktns";
const SITE_DESCRIPTION =
  "The all-in-one booking and order management platform for beauty service vendors.";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Booktns — Beauty Booking for Vendors",
    template: "%s | Booktns",
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
    title: "Booktns — Beauty Booking for Vendors",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Booktns — Beauty Booking for Vendors",
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
  // Google Search Console's "HTML tag" domain-ownership method — paste the
  // content value it gives you (not the whole <meta> tag) into
  // GOOGLE_SITE_VERIFICATION and this renders <meta name="google-site-
  // verification" ...> in <head> automatically. Left out entirely when
  // unset, rather than rendering an empty tag.
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#C0283A" },
    { media: "(prefers-color-scheme: dark)", color: "#D43D50" },
  ],
};

const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('booktns-theme');
    var s = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t || s);
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/* Runs before first paint to prevent flash of wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col" style={{ background: "var(--bg)", color: "var(--tx)" }}>
        <ThemeProvider>
          <AnalyticsProvider>
            <NextTopLoader color="var(--tx)" height={2} showSpinner={false} />
            {children}
          </AnalyticsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
