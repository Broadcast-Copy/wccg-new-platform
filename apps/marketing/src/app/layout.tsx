import type { Metadata } from "next";
import "./globals.css";
import { SITE_URL } from "@/lib/site";

const title = "Broadcast Copy — the operating system for modern radio";
const description =
  "Broadcast Copy runs your FCC station end to end: streaming, programming, DJ operations, listener loyalty, FCC compliance, and ad sales — with an agentic layer that handles the busywork. $49.99/mo per station.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description,
  applicationName: "Broadcast Copy",
  openGraph: {
    title,
    description,
    type: "website",
    url: SITE_URL,
    siteName: "Broadcast Copy",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
