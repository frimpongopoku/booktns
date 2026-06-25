import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Booktns — Beauty Booking for Vendors",
  description: "The all-in-one booking and order management platform for beauty service vendors.",
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
          <NextTopLoader color="var(--ac)" height={2} showSpinner={false} />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
