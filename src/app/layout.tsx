import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { OfflineBanner } from "@/components/offline-banner";
import { TRPCProvider } from "@/trpc/react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Autonomous EHS | ISO 45001- & 14001-style IMS",
  description:
    "Autonomous EHS programme platform — incident, CAPA, and environmental management with human approval for material changes. Not a certification body or agency filing system.",
};

/** Allow pinch-zoom on small screens for field readability (WCAG 1.4.4). */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <TRPCProvider>
          <OfflineBanner />
          {children}
        </TRPCProvider>
      </body>
    </html>
  );
}
