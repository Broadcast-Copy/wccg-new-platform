import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Broadcast Copy — Control",
  description: "Manage your organization and stations on Broadcast Copy.",
  robots: { index: false, follow: false },
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
