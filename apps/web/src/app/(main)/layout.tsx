"use client";

import Link from "next/link";
import { UserMenu } from "@/components/auth/user-menu";
import { PointsBadge } from "@/components/points/points-badge";
import { MobileNav } from "@/components/navigation/mobile-nav";
import {
  Radio,
  Calendar,
  Mic2,
  CalendarDays,
  Gift,
} from "lucide-react";

const navLinks = [
  { href: "/channels", label: "Channels", icon: Radio },
  { href: "/schedule", label: "Schedule", icon: Calendar },
  { href: "/shows", label: "Shows", icon: Mic2 },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/rewards", label: "Rewards", icon: Gift },
];

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-2 text-xl font-bold tracking-tight"
            >
              <Radio className="h-6 w-6 text-primary" />
              <span>WCCG 104.5</span>
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <PointsBadge />
            <UserMenu />
            <MobileNav navLinks={navLinks} />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 pb-16">
        <div className="container py-6">{children}</div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/50 pb-20">
        <div className="container py-8">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
            <div className="space-y-3">
              <h3 className="font-semibold">WCCG 104.5 FM</h3>
              <p className="text-sm text-muted-foreground">
                Charlotte&apos;s #1 Gospel Station. Uplifting your spirit 24/7
                with the best in gospel music, talk shows, and community events.
              </p>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Listen</h3>
              <nav className="flex flex-col gap-2">
                <Link
                  href="/channels"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Channel Guide
                </Link>
                <Link
                  href="/schedule"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Schedule
                </Link>
                <Link
                  href="/shows"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Shows
                </Link>
              </nav>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Community</h3>
              <nav className="flex flex-col gap-2">
                <Link
                  href="/events"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Events
                </Link>
                <Link
                  href="/rewards"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Rewards
                </Link>
              </nav>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Info</h3>
              <nav className="flex flex-col gap-2">
                <Link
                  href="/about"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  About
                </Link>
                <Link
                  href="/contact"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Contact
                </Link>
                <Link
                  href="/privacy"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Privacy Policy
                </Link>
              </nav>
            </div>
          </div>
          <div className="mt-8 border-t pt-6">
            <p className="text-center text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} WCCG 104.5 FM. All rights
              reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
