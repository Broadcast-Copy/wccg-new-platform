"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserMenu } from "@/components/auth/user-menu";
import { MobileNav } from "@/components/navigation/mobile-nav";
import Image from "next/image";
import {
  Compass,
  CalendarDays,
  Users2,
  Mail,
  Home,
  Headphones,
  Radio,
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
  { href: "/mixes", label: "Mixes", icon: Headphones },
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
              <Image
                src="/images/logos/wccg-logo-black.png"
                alt="WCCG 104.5 FM"
                width={120}
                height={40}
                className="h-8 w-auto brightness-0 invert dark:brightness-0 dark:invert"
                priority
              />
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
                <Image
                  src="/images/logos/wccg-logo-black.png"
                  alt="WCCG 104.5 FM"
                  width={140}
                  height={46}
                  className="h-8 w-auto brightness-0 invert"
                />
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
                <Link href="/mixes" className="text-sm text-white/35 hover:text-[#74ddc7] transition-colors">DJ Mixes</Link>
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
                <Link href="/contact#advertise" className="text-sm text-white/35 hover:text-[#74ddc7] transition-colors">Advertise</Link>
                <Link href="/contact#submit-music" className="text-sm text-white/35 hover:text-[#74ddc7] transition-colors">Submit Music</Link>
                <Link href="/contact#creator-services" className="text-sm text-white/35 hover:text-[#74ddc7] transition-colors">Creator Services</Link>
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
