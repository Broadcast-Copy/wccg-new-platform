"use client";

import Link from "next/link";
import { UserMenu } from "@/components/auth/user-menu";
import { PointsBadge } from "@/components/points/points-badge";
import { MobileNav } from "@/components/navigation/mobile-nav";
import {
  Radio,
  Compass,
  ShoppingBag,
  CalendarDays,
  Users2,
  Mail,
} from "lucide-react";

const navLinks = [
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/channels", label: "Streaming", icon: Radio },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/marketplace", label: "Marketplace", icon: ShoppingBag },
  { href: "/community", label: "Community", icon: Users2 },
  { href: "/contact", label: "Connect", icon: Mail },
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
            <nav className="hidden items-center gap-1 lg:flex">
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

      {/* Footer — matching original WCCG site structure */}
      <footer className="border-t bg-gray-950 text-gray-300 pb-20">
        <div className="container py-10">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-5">
            {/* Brand */}
            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center gap-2">
                <Radio className="h-5 w-5 text-teal-400" />
                <h3 className="font-bold text-white text-lg">WCCG 104.5 FM</h3>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                Hip Hop, Sports, Reactions and Podcasts. Serving Fayetteville
                and the greater NC community with nonstop hits, exclusive
                interviews, giveaways, and local event perks.
              </p>
              <div className="text-sm text-gray-500">
                <p>Carson Communications</p>
                <p>115 Gillespie Street, Fayetteville, NC 28301</p>
                <p>(910) 484-4932</p>
              </div>
            </div>

            {/* Listen */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Listen</h3>
              <nav className="flex flex-col gap-2">
                <Link href="/channels" className="text-sm text-gray-400 hover:text-teal-400 transition-colors">Channel Guide</Link>
                <Link href="/discover" className="text-sm text-gray-400 hover:text-teal-400 transition-colors">Discover</Link>
                <Link href="/shows" className="text-sm text-gray-400 hover:text-teal-400 transition-colors">Shows</Link>
                <Link href="/hosts" className="text-sm text-gray-400 hover:text-teal-400 transition-colors">Hosts &amp; DJs</Link>
                <Link href="/schedule" className="text-sm text-gray-400 hover:text-teal-400 transition-colors">Schedule</Link>
              </nav>
            </div>

            {/* Community */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Community</h3>
              <nav className="flex flex-col gap-2">
                <Link href="/events" className="text-sm text-gray-400 hover:text-teal-400 transition-colors">Events &amp; Tickets</Link>
                <Link href="/community" className="text-sm text-gray-400 hover:text-teal-400 transition-colors">Community Directory</Link>
                <Link href="/marketplace" className="text-sm text-gray-400 hover:text-teal-400 transition-colors">Marketplace</Link>
                <Link href="/rewards" className="text-sm text-gray-400 hover:text-teal-400 transition-colors">mY1045 Perks</Link>
              </nav>
            </div>

            {/* Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Support</h3>
              <nav className="flex flex-col gap-2">
                <Link href="/contact" className="text-sm text-gray-400 hover:text-teal-400 transition-colors">Contact Us</Link>
                <Link href="/contact" className="text-sm text-gray-400 hover:text-teal-400 transition-colors">Advertise</Link>
                <Link href="/contact" className="text-sm text-gray-400 hover:text-teal-400 transition-colors">Submit Music</Link>
                <Link href="/contact" className="text-sm text-gray-400 hover:text-teal-400 transition-colors">Creator Services</Link>
              </nav>
            </div>
          </div>

          <div className="mt-8 border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-500">
              &copy; {new Date().getFullYear()} Carson Communications / WCCG 104.5 FM. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <Link href="/privacy" className="hover:text-gray-300 transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-gray-300 transition-colors">Terms</Link>
              <Link href="/legal" className="hover:text-gray-300 transition-colors">Legal</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
