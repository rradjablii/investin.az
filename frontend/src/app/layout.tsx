import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import SiteHeader from "@/components/SiteHeader";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "investin.az — explore Baku property on the map", template: "%s · investin.az" },
  description:
    "Map-first property discovery for Baku, Azerbaijan. Every listing shows its source, original asking currency and when it was last checked.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading request headers opts every page into dynamic rendering, which the per-request CSP nonce requires.
  await headers();
  return (
    <html lang="en" className={inter.variable}>
      <body className="flex h-dvh flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2">
          Skip to content
        </a>
        <Providers>
          <SiteHeader />
          <main id="main" tabIndex={0} className="min-h-0 flex-1 overflow-auto focus-visible:outline-offset-[-3px]">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
