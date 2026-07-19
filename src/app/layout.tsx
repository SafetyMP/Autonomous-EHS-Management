import type { Metadata, Viewport } from "next";
import { Fraunces, Geist_Mono, Source_Sans_3 } from "next/font/google";
import { OfflineBanner } from "@/components/offline-banner";
import { TRPCProvider } from "@/trpc/react";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

const sourceSans3 = Source_Sans_3({
  variable: "--font-sans",
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
      data-theme="calm"
      className={`${fraunces.variable} ${sourceSans3.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
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
