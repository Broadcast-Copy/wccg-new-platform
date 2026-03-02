"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { UserMenu } from "@/components/auth/user-menu";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { MobileNav } from "@/components/navigation/mobile-nav";
import { AppImage as Image } from "@/components/ui/app-image";
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
  Trophy,
  ChevronDown,
  HelpCircle,
} from "lucide-react";

const SECURENET_PLAYER_URL = "https://streamdb7web.securenetsystems.net/cirruscontent/WCCG";

// Simplified top nav: Home, Discover, Streaming (mega menu), Support
const navLinks = [
  { href: "/", label: "Home" },
  { href: "/discover", label: "Discover" },
  { href: "/contact", label: "Support" },
];

const streamingChannels = [
  { href: "/channels", label: "WCCG 104.5 FM", description: "Hip Hop, Sports & Podcasts" },
  { href: "/channels", label: "SOUL 104.5 FM", description: "Classic Soul & R&B" },
  { href: "/channels", label: "HOT 104.5 FM", description: "Today's Hottest Hits" },
  { href: "/channels", label: "104.5 THE VIBE", description: "Non-stop Vibes & Chill" },
];

// Full nav links for mobile drawer (keep full navigation there)
const mobileNavLinks = [
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/channels", label: "Listen", icon: Headphones },
  { href: "/shows", label: "Shows", icon: Mic },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/contests", label: "Contests", icon: Trophy },
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

function StreamingMegaMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const isActive = pathname.startsWith("/channels");

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all ${
          isActive || open
            ? "bg-white/10 text-[#74ddc7]"
            : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
        }`}
      >
        Streaming
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-72 rounded-xl border border-white/[0.08] bg-[#141420] p-2 shadow-2xl">
          {streamingChannels.map((channel) => (
            <Link
              key={channel.label}
              href={channel.href}
              onClick={() => setOpen(false)}
              className="flex flex-col gap-0.5 rounded-lg px-3 py-2.5 hover:bg-white/[0.06] transition-colors"
            >
              <span className="text-sm font-semibold text-white">{channel.label}</span>
              <span className="text-xs text-white/40">{channel.description}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ListenLiveButton() {
  const handleClick = () => {
    window.open(
      SECURENET_PLAYER_URL,
      "wccg_player",
      "width=400,height=660,scrollbars=no,resizable=yes",
    );
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold transition-all bg-[#74ddc7]/10 text-[#74ddc7] border border-[#74ddc7]/20 hover:bg-[#74ddc7]/20"
      aria-label="Listen live"
    >
      <Radio className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Listen Live</span>
    </button>
  );
}

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
                src="/images/logos/1045fm-logo.png"
                alt="WCCG 104.5 FM"
                width={500}
                height={324}
                className="w-[120px] h-auto"
                priority
              />
            </Link>


            {/* Desktop nav links — simplified */}
            <nav className="hidden items-center gap-0.5 lg:flex">
              {navLinks.map((link) => {
                const isActive =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname === link.href || pathname.startsWith(link.href + "/");
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

              {/* Streaming mega menu */}
              <StreamingMegaMenu />
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <ListenLiveButton />
            <button className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-colors">
              <Search className="h-4 w-4" />
            </button>
            <NotificationBell />
            <UserMenu />
            <MobileNav navLinks={mobileNavLinks} />
          </div>
        </div>
      </header>

      {/* Main content — pb accounts for bottom tab bar + player */}
      <main className="flex-1 pb-32">
        <div className="container pt-8 pb-6">{children}</div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] bg-[#07070c] pb-28">
        <div className="container py-10">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-6">
            {/* Brand */}
            <div className="space-y-3 sm:col-span-2 lg:col-span-2">
              <div className="flex items-center gap-2.5">
                <Image
                  src="/images/logos/1045fm-logo.png"
                  alt="WCCG 104.5 FM"
                  width={500}
                  height={324}
                  className="w-[140px] h-auto"
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

            {/* Connect */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-white/60 uppercase tracking-widest">Connect</h3>
              <nav className="flex flex-col gap-1.5">
                <Link href="/contact" className="text-sm text-white/35 hover:text-[#74ddc7] transition-colors">Contact Us</Link>
                <Link href="/faq" className="text-sm text-white/35 hover:text-[#74ddc7] transition-colors">FAQ</Link>
                <Link href="/sitemap" className="text-sm text-white/35 hover:text-[#74ddc7] transition-colors">Sitemap</Link>
                <Link href="/innovation-center" className="text-sm text-white/35 hover:text-[#74ddc7] transition-colors">Innovation Center</Link>
                <Link href="/brand-guidelines" className="text-sm text-white/35 hover:text-[#74ddc7] transition-colors">Brand Guidelines</Link>
                <Link href="/contests" className="text-sm text-white/35 hover:text-[#74ddc7] transition-colors">Contests &amp; Giveaways</Link>
                <Link href="/contest-guidelines" className="text-sm text-white/35 hover:text-[#74ddc7] transition-colors">Contest Guidelines</Link>
              </nav>
            </div>

            {/* For Advertisers */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-white/60 uppercase tracking-widest">For Advertisers</h3>
              <nav className="flex flex-col gap-1.5">
                <Link href="/advertise" className="text-sm text-white/35 hover:text-[#74ddc7] transition-colors">Become An Advertiser</Link>
                <Link href="/advertise/portal" className="text-sm text-white/35 hover:text-[#74ddc7] transition-colors">Advertiser Portal</Link>
                <Link href="/advertise/guidelines" className="text-sm text-white/35 hover:text-[#74ddc7] transition-colors">Advertiser Guidelines</Link>
                <Link href="/advertise/media-kit" className="text-sm text-white/35 hover:text-[#74ddc7] transition-colors">WCCG Media Kit</Link>
              </nav>
            </div>

            {/* Careers */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-white/60 uppercase tracking-widest">Careers</h3>
              <nav className="flex flex-col gap-1.5">
                <Link href="/careers" className="text-sm text-white/35 hover:text-[#74ddc7] transition-colors">Employment</Link>
                <Link href="/careers/internships" className="text-sm text-white/35 hover:text-[#74ddc7] transition-colors">Internships</Link>
                <Link href="/careers/volunteer" className="text-sm text-white/35 hover:text-[#74ddc7] transition-colors">Volunteer</Link>
                <Link href="/careers/trainings" className="text-sm text-white/35 hover:text-[#74ddc7] transition-colors">Trainings &amp; Guides</Link>
                <Link href="/eeo" className="text-sm text-white/35 hover:text-[#74ddc7] transition-colors">EEO</Link>
              </nav>
            </div>

            {/* For Creators */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-white/60 uppercase tracking-widest">For Creators</h3>
              <nav className="flex flex-col gap-1.5">
                <Link href="/creators" className="text-sm text-white/35 hover:text-[#74ddc7] transition-colors">Become A Creator</Link>
                <Link href="/creators/podcast" className="text-sm text-white/35 hover:text-[#74ddc7] transition-colors">Podcast &amp; Launch</Link>
                <Link href="/creators/upload-music" className="text-sm text-white/35 hover:text-[#74ddc7] transition-colors">Upload Music</Link>
              </nav>
            </div>
          </div>

          {/* Legal Links Row */}
          <div className="mt-8 border-t border-white/[0.06] pt-6">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-4">
              <span className="text-xs font-semibold text-white/40 uppercase tracking-widest mr-2">Legal</span>
              <Link href="/privacy" className="text-xs text-white/25 hover:text-white/50 transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="text-xs text-white/25 hover:text-white/50 transition-colors">Terms of Service</Link>
              <Link href="/legal" className="text-xs text-white/25 hover:text-white/50 transition-colors">Legal</Link>
              <Link href="/contest-rules" className="text-xs text-white/25 hover:text-white/50 transition-colors">Contest Rules</Link>
              <Link href="/public-file" className="text-xs text-white/25 hover:text-white/50 transition-colors">Public Inspection File</Link>
              <Link href="/public-file-help" className="text-xs text-white/25 hover:text-white/50 transition-colors">Public File Help</Link>
              <Link href="/fcc-applications" className="text-xs text-white/25 hover:text-white/50 transition-colors">FCC Applications</Link>
            </div>
            <p className="text-xs text-white/20">
              &copy; {new Date().getFullYear()} Carson Communications / WCCG 104.5 FM. All rights reserved.
            </p>
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
