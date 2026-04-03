import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { SupabaseProvider } from "@/components/providers/supabase-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AudioProvider } from "@/components/player/audio-provider";
import { GlobalPlayer } from "@/components/player/global-player";
import { StreamPlayerProvider } from "@/components/player/stream-player-overlay";
import { InactivityGuard } from "@/components/providers/inactivity-guard";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WCCG 104.5 FM",
  description:
    "Your community radio station. Listen live, discover shows, earn rewards, and connect with your favorite hosts.",
  manifest: "/manifest.json",
  metadataBase: new URL("https://app.wccg1045fm.com"),
  openGraph: {
    type: "website",
    siteName: "WCCG 104.5 FM",
    title: "WCCG 104.5 FM — The Hip Hop Station",
    description:
      "Fayetteville's Hip Hop Station. Listen live, earn points, request songs, and connect with your community.",
    url: "https://app.wccg1045fm.com",
    images: [
      {
        url: "/images/logos/wccg-logo.png",
        width: 500,
        height: 324,
        alt: "WCCG 104.5 FM",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WCCG 104.5 FM — The Hip Hop Station",
    description:
      "Fayetteville's Hip Hop Station. Listen live, earn points, request songs, and connect with your community.",
    images: ["/images/logos/wccg-logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <SupabaseProvider>
            <AudioProvider>
              <StreamPlayerProvider>
                <InactivityGuard>
                  {children}
                  <GlobalPlayer />
                </InactivityGuard>
              </StreamPlayerProvider>
            </AudioProvider>
          </SupabaseProvider>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
