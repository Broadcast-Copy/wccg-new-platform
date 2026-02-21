"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserMenu } from "@/components/auth/user-menu";
import { MobileNav } from "@/components/navigation/mobile-nav";
import {
  Radio,
  Compass,
  CalendarDays,
  Users2,
  Mail,
  Home,
  Headphones,
  Search,
  Mic,
  Gift,
} from "lucide-react";

const navLinks = [
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/channels", label: "Listen", icon: Headphones },
  { href: "/shows", label: "Shows", icon: Mic },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/community", label: "Community", icon: Users2 },
  { href: "/contact", label: "Connect", icon: Mail },
];

// iHeartRadio-style bottom tab bar items
const bottomTabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/channels", label: "Listen", icon: Radio },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/shows", label: "Shows", icon: Mic },
  { href: "/rewards", label: "Perks", icon: Gift },
];

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0f]">
      {/* Top Header — minimal, SiriusXM-inspired */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0a0a0f]/95 backdrop-blur-xl">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="flex items-center gap-2.5 group"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#74ddc7] to-[#7401df]">
                <Radio className="h-4 w-4 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight text-white leading-none">
                  WCCG
                </span>
                <span className="text-[10px] font-medium text-[#74ddc7] leading-none">
                  104.5 FM
                </span>
              </div>
            </Link>

            {/* Desktop nav links */}
            <nav className="hidden items-center gap-0.5 lg:flex">
              {navLinks.map((link) => {
                const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all ${
                      isActive
                        ? "bg-white/10 text-[#74ddc7]"
                        : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <button className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-colors">
              <Search className="h-4 w-4" />
            </button>
            <UserMenu />
            <MobileNav navLinks={navLinks} />
          </div>
        </div>
      </header>

      {/* Main content — pb accounts for bottom tab bar + player */}
      <main className="flex-1 pb-32">
        <div className="container py-6">{children}</div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] bg-[#07070c] pb-28">
        <div className="container py-10">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-5">
            {/* Brand */}
            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#74ddc7] to-[#7401df]">
                  <Radio className="h-3.5 w-3.5 text-white" />
                </div>
                <h3 className="font-bold text-white text-lg">WCCG 104.5 FM</h3>
              </div>
              <p className="text-sm text-white/40 leading-relaxed max-w-xs">
                Hip Hop, Sports, Reactions and Podcasts. Serving Fayetteville
                and the greater NC community.
              </p>
              <div className="text-xs text-white/25 space-y-0.5">
                <p>Carson Communications</p>
                <p>115 Gillespie Street, Fayetteville, NC 28301</p>
                <p>(910) 484-4932</p>
              </div>
            </div>

            {/* Listen */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-white/60 uppercase tracking-widest">Listen</h3>
              <nav className="flex flex-col gap-2">
                <Link href="/channels" className="text-sm text-white/35 hover:text-[#74ddc7] transition-colors">Channel Guide</Link>
                <Link href="/discover" className="text-sm text-white/35 hover:text-[#74ddc7] transition-colors">Discover</Link>
                <Link href="/shows" className="text-sm text-white/35 hover:text-[#74ddc7] transition-colors">Shows</Link>
                <Link href="/hosts" className="text-sm text-white/35 hover:text-[#74ddc7] transition-colors">Hosts &amp; DJs</Link>
                <Link href="/schedule" className="text-sm text-white/35 hover:text-[#74ddc7] transition-colors">Schedule</Link>
              </nav>
            </div>

            {/* Community */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-white/60 uppercase tracking-widest">Community</h3>
              <nav className="flex flex-col gap-2">
                <Link href="/events" className="text-sm text-white/35 hover:text-[#74ddc7] transition-colors">Events &amp; Tickets</Link>
                <Link href="/community" className="text-sm text-white/35 hover:text-[#74ddc7] transition-colors">Community Directory</Link>
                <Link href="/marketplace" className="text-sm text-white/35 hover:text-[#74ddc7] transition-colors">Marketplace</Link>
                <Link href="/rewards" className="text-sm text-white/35 hover:text-[#74ddc7] transition-colors">mY1045 Perks</Link>
              </nav>
            </div>

            {/* Support */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-white/60 uppercase tracking-widest">Support</h3>
              <nav className="flex flex-col gap-2">
                <Link href="/contact" className="text-sm text-white/35 hover:text-[#74ddc7] transition-colors">Contact Us</Link>
                <Link href="/contact" className="text-sm text-white/35 hover:text-[#74ddc7] transition-colors">Advertise</Link>
                <Link href="/contact" className="text-sm text-white/35 hover:text-[#74ddc7] transition-colors">Submit Music</Link>
                <Link href="/contact" className="text-sm text-white/35 hover:text-[#74ddc7] transition-colors">Creator Services</Link>
              </nav>
            </div>
          </div>

          <div className="mt-8 border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-white/20">
              &copy; {new Date().getFullYear()} Carson Communications / WCCG 104.5 FM. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-xs text-white/20">
              <Link href="/privacy" className="hover:text-white/50 transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-white/50 transition-colors">Terms</Link>
              <Link href="/legal" className="hover:text-white/50 transition-colors">Legal</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Bottom Tab Bar — iHeartRadio-inspired, fixed */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.06] bg-[#0a0a0f]/95 backdrop-blur-xl">
        <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
          {bottomTabs.map((tab) => {
            const isActive =
              tab.href === "/"
                ? pathname === "/"
                : pathname === tab.href || pathname.startsWith(tab.href + "/");
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-all ${
                  isActive
                    ? "text-[#74ddc7]"
                    : "text-white/30 hover:text-white/60"
                }`}
              >
                <tab.icon className={`h-5 w-5 ${isActive ? "drop-shadow-[0_0_6px_rgba(116,221,199,0.5)]" : ""}`} />
                <span className="text-[10px] font-semibold">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
