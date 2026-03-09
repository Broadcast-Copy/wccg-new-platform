"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { UserMenu } from "@/components/auth/user-menu";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { MobileNav } from "@/components/navigation/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { ThemeLogo } from "@/components/theme-logo";
import { AppImage as Image } from "@/components/ui/app-image";
import { SpotCartProvider } from "@/components/providers/spot-cart-provider";
import { SpotCartDrawer } from "@/components/sales/spot-cart-drawer";
import { useStreamPlayer } from "@/components/player/stream-player-overlay";
import { useNowPlaying } from "@/hooks/use-now-playing";
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
  ArrowDownRight,
  ShoppingCart,
} from "lucide-react";

// Desktop nav: Home, Discover, [Streaming mega], Support
const navLinks = [
  { href: "/", label: "Home" },
  { href: "/discover", label: "Discover" },
  // Streaming mega menu is rendered separately between Discover and Support
  { href: "/contact", label: "Support" },
];

const streamingChannels = [
  { href: "/channels/stream_wccg", label: "WCCG 104.5 FM", badge: "/images/channels/wccg-badge.png" },
  { href: "/channels/stream_soul", label: "SOUL 104.5 FM", badge: "/images/channels/soul-badge.png" },
  { href: "/channels/stream_hot", label: "HOT 104.5 FM", badge: "/images/channels/hot-badge.png" },
  { href: "/channels/stream_vibe", label: "104.5 THE VIBE", badge: "/images/channels/vibe-badge.png" },
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

function NavLink({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const isActive =
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all ${
        isActive
          ? "bg-white/10 text-[#74ddc7]"
          : "text-muted-foreground hover:text-foreground/80 hover:bg-foreground/[0.04]"
      }`}
    >
      {label}
    </Link>
  );
}

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
    <div ref={ref} className="relative inline-flex items-center">
      {/* Label is a regular link — navigates to /channels */}
      <Link
        href="/channels"
        className={`inline-flex items-center rounded-l-full pl-3.5 pr-1 py-1.5 text-[13px] font-medium transition-all ${
          isActive || open
            ? "bg-white/10 text-[#74ddc7]"
            : "text-muted-foreground hover:text-foreground/80 hover:bg-foreground/[0.04]"
        }`}
      >
        Streaming
      </Link>
      {/* Only the chevron arrow opens the mega menu dropdown */}
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center rounded-r-full pr-3 pl-0.5 py-1.5 transition-all ${
          isActive || open
            ? "bg-white/10 text-[#74ddc7]"
            : "text-muted-foreground hover:text-foreground/80 hover:bg-foreground/[0.04]"
        }`}
        aria-label="Toggle streaming channels menu"
      >
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[900px] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden z-50">
          <div className="flex">
            {/* ── Left: Legacy Streaming info panel (always dark) ── */}
            <div className="relative w-[260px] flex-shrink-0 bg-[#0a0e1a] p-8 flex flex-col justify-between overflow-hidden">
              {/* Subtle background accent */}
              <div className="absolute -right-10 -top-10 h-[200px] w-[200px] rounded-full bg-[rgba(116,221,199,0.04)] blur-[80px]" />
              <div className="relative z-10">
                <h3 className="text-xl font-black text-white leading-tight mb-3">
                  Legacy Streaming
                </h3>
                <p className="text-[13px] text-white/40 leading-relaxed">
                  These timeless streams carry the music, culture, and community
                  that built our legacy—now available anytime, anywhere through
                  our modern streaming platform.
                </p>
              </div>
              <Link
                href="/channels"
                onClick={() => setOpen(false)}
                className="relative z-10 inline-flex items-center gap-1.5 text-sm text-white/25 hover:text-white/50 transition-colors mt-6"
              >
                Browse All
                <ArrowDownRight className="h-4 w-4" />
              </Link>
            </div>

            {/* ── Right: Channel list with swatches + logos ── */}
            <div className="flex-1 py-3 px-2">
              {streamingChannels.map((channel) => (
                <Link
                  key={channel.label}
                  href={channel.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-4 py-3 hover:bg-foreground/[0.04] transition-colors group"
                >
                  {/* Arrow icon */}
                  <ArrowDownRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-[#74ddc7] transition-colors flex-shrink-0" />

                  {/* Channel name */}
                  <span className="text-sm font-bold text-foreground w-[160px] flex-shrink-0">
                    {channel.label}
                  </span>

                  {/* Pre-made badge image */}
                  <div className="relative h-16 flex-1 rounded-xl overflow-hidden">
                    <Image
                      src={channel.badge}
                      alt={channel.label}
                      fill
                      className="object-cover"
                      sizes="400px"
                    />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ListenLiveButton() {
  const { open } = useStreamPlayer();
  const { data: nowPlaying } = useNowPlaying(true);

  const marqueeText =
    nowPlaying?.artist && nowPlaying?.title
      ? `${nowPlaying.artist} — ${nowPlaying.title}`
      : nowPlaying?.title || null;

  return (
    <button
      onClick={open}
      className="inline-flex items-center gap-1.5 rounded-full py-1.5 text-[12px] font-bold transition-all bg-[#74ddc7]/10 text-[#74ddc7] border border-[#74ddc7]/20 hover:bg-[#74ddc7]/20 pl-3 pr-3 max-w-[280px] sm:max-w-[320px] overflow-hidden"
      aria-label="Listen live"
    >
      {/* Pulsing live dot */}
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#dc2626] opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#dc2626]" />
      </span>
      <Radio className="h-3.5 w-3.5 shrink-0" />
      {marqueeText ? (
        <span className="hidden sm:block overflow-hidden whitespace-nowrap min-w-0">
          <span className="inline-block animate-marquee" style={{ animationDuration: "12s" }}>
            {marqueeText}&nbsp;&nbsp;&nbsp;&bull;&nbsp;&nbsp;&nbsp;{marqueeText}&nbsp;&nbsp;&nbsp;&bull;&nbsp;&nbsp;&nbsp;
          </span>
        </span>
      ) : (
        <span className="hidden sm:inline">Listen Live</span>
      )}
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
    <SpotCartProvider>
    <div className="flex min-h-screen flex-col bg-background">
      <SpotCartDrawer />
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="container flex items-center pt-[10px] pb-[10px]">
          {/* Left: Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group shrink-0"
          >
            <ThemeLogo width={120} priority />
          </Link>

          {/* Center: Nav links — Home, Discover, Streaming, Support */}
          <nav className="hidden lg:flex items-center justify-center gap-0.5 flex-1">
            {/* Home */}
            <NavLink href="/" label="Home" pathname={pathname} />
            {/* Discover */}
            <NavLink href="/discover" label="Discover" pathname={pathname} />
            {/* Streaming mega menu */}
            <StreamingMegaMenu />
            {/* Support */}
            <NavLink href="/contact" label="Support" pathname={pathname} />
          </nav>

          {/* Right: Controls */}
          <div className="flex items-center gap-2 ml-auto">
            <ListenLiveButton />
            <button className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full text-foreground/40 hover:text-foreground/70 hover:bg-foreground/[0.06] transition-colors">
              <Search className="h-4 w-4" />
            </button>
            <ThemeToggle />
            <NotificationBell />
            <Link
              href="/marketplace"
              className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full text-foreground/40 hover:text-foreground/70 hover:bg-foreground/[0.06] transition-colors relative"
              aria-label="Shopping Cart"
            >
              <ShoppingCart className="h-4 w-4" />
            </Link>
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
      <footer className="border-t border-border bg-background pb-28">
        <div className="container py-10">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-6">
            {/* Brand */}
            <div className="space-y-3 sm:col-span-2 lg:col-span-2">
              <div className="flex items-center gap-2.5">
                <ThemeLogo width={140} />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                Hip Hop, Sports, Reactions and Podcasts. Serving Fayetteville
                and the greater NC community.
              </p>
              <div className="text-xs text-muted-foreground/60 space-y-0.5">
                <p>Carson Communications</p>
                <p>115 Gillespie Street, Fayetteville, NC 28301</p>
                <p>(910) 484-4932</p>
              </div>
            </div>

            {/* Connect */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-foreground/60 uppercase tracking-widest">Connect</h3>
              <nav className="flex flex-col gap-1.5">
                <Link href="/contact" className="text-sm text-foreground/35 hover:text-[#74ddc7] transition-colors">Contact Us</Link>
                <Link href="/faq" className="text-sm text-foreground/35 hover:text-[#74ddc7] transition-colors">FAQ</Link>
                <Link href="/sitemap" className="text-sm text-foreground/35 hover:text-[#74ddc7] transition-colors">Sitemap</Link>
                <Link href="/innovation-center" className="text-sm text-foreground/35 hover:text-[#74ddc7] transition-colors">Innovation Center</Link>
                <Link href="/brand-guidelines" className="text-sm text-foreground/35 hover:text-[#74ddc7] transition-colors">Brand Guidelines</Link>
                <Link href="/contests" className="text-sm text-foreground/35 hover:text-[#74ddc7] transition-colors">Contests &amp; Giveaways</Link>
                <Link href="/contest-guidelines" className="text-sm text-foreground/35 hover:text-[#74ddc7] transition-colors">Contest Guidelines</Link>
              </nav>
            </div>

            {/* For Advertisers */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-foreground/60 uppercase tracking-widest">For Advertisers</h3>
              <nav className="flex flex-col gap-1.5">
                <Link href="/advertise" className="text-sm text-foreground/35 hover:text-[#74ddc7] transition-colors">Become An Advertiser</Link>
                <Link href="/advertise/portal" className="text-sm text-foreground/35 hover:text-[#74ddc7] transition-colors">Advertiser Portal</Link>
                <Link href="/advertise/guidelines" className="text-sm text-foreground/35 hover:text-[#74ddc7] transition-colors">Advertiser Guidelines</Link>
                <Link href="/advertise/media-kit" className="text-sm text-foreground/35 hover:text-[#74ddc7] transition-colors">WCCG Media Kit</Link>
              </nav>
            </div>

            {/* Careers */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-foreground/60 uppercase tracking-widest">Careers</h3>
              <nav className="flex flex-col gap-1.5">
                <Link href="/careers" className="text-sm text-foreground/35 hover:text-[#74ddc7] transition-colors">Employment</Link>
                <Link href="/careers/internships" className="text-sm text-foreground/35 hover:text-[#74ddc7] transition-colors">Internships</Link>
                <Link href="/careers/volunteer" className="text-sm text-foreground/35 hover:text-[#74ddc7] transition-colors">Volunteer</Link>
                <Link href="/careers/trainings" className="text-sm text-foreground/35 hover:text-[#74ddc7] transition-colors">Trainings &amp; Guides</Link>
                <Link href="/eeo" className="text-sm text-foreground/35 hover:text-[#74ddc7] transition-colors">EEO</Link>
              </nav>
            </div>

            {/* For Creators */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-foreground/60 uppercase tracking-widest">For Creators</h3>
              <nav className="flex flex-col gap-1.5">
                <Link href="/creators" className="text-sm text-foreground/35 hover:text-[#74ddc7] transition-colors">Become A Creator</Link>
                <Link href="/creators/podcast" className="text-sm text-foreground/35 hover:text-[#74ddc7] transition-colors">Podcast &amp; Launch</Link>
                <Link href="/creators/upload-music" className="text-sm text-foreground/35 hover:text-[#74ddc7] transition-colors">Upload Music</Link>
              </nav>
            </div>
          </div>

          {/* Carson Communications Banner */}
          <div className="mt-8 rounded-xl border border-border bg-white/[0.03] p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#dc2626]/10 border border-[#dc2626]/20">
                <span className="text-lg font-black text-[#dc2626]">C</span>
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Carson Communications</p>
                <p className="text-xs text-muted-foreground">Your Trusted Partner In Advertising</p>
              </div>
            </div>
            <Link
              href="/advertise"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold text-foreground/70 hover:bg-foreground/[0.06] hover:text-foreground transition-colors"
            >
              Get Started
            </Link>
          </div>

          {/* Legal Links Row */}
          <div className="mt-6 border-t border-border pt-6">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-4">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mr-2">Legal</span>
              <Link href="/privacy" className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">Terms of Service</Link>
              <Link href="/legal" className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">Legal</Link>
              <Link href="/contest-rules" className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">Contest Rules</Link>
              <Link href="/public-file" className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">Public Inspection File</Link>
              <Link href="/public-file-help" className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">Public File Help</Link>
              <Link href="/fcc-applications" className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">FCC Applications</Link>
            </div>

            {/* Social Media + Copyright */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <p className="text-xs text-foreground/20">
                &copy; {new Date().getFullYear()} Carson Communications / WCCG 104.5 FM. All rights reserved.
                <br className="sm:hidden" />
                <span className="sm:ml-2">Platform by The James E. Carson Innovation Center</span>
              </p>
              <div className="flex items-center gap-3">
                {/* Facebook */}
                <a href="https://facebook.com/wccg1045fm" target="_blank" rel="noopener noreferrer" className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/[0.06] text-muted-foreground/70 hover:text-foreground/70 hover:bg-white/[0.1] transition-colors" aria-label="Facebook">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                {/* X / Twitter */}
                <a href="https://x.com/wccg1045fm" target="_blank" rel="noopener noreferrer" className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/[0.06] text-muted-foreground/70 hover:text-foreground/70 hover:bg-white/[0.1] transition-colors" aria-label="X">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                {/* Instagram */}
                <a href="https://instagram.com/wccg1045fm" target="_blank" rel="noopener noreferrer" className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/[0.06] text-muted-foreground/70 hover:text-foreground/70 hover:bg-white/[0.1] transition-colors" aria-label="Instagram">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </a>
                {/* YouTube */}
                <a href="https://youtube.com/@wccg1045fm" target="_blank" rel="noopener noreferrer" className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/[0.06] text-muted-foreground/70 hover:text-foreground/70 hover:bg-white/[0.1] transition-colors" aria-label="YouTube">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                </a>
                {/* TikTok */}
                <a href="https://tiktok.com/@wccg1045fm" target="_blank" rel="noopener noreferrer" className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/[0.06] text-muted-foreground/70 hover:text-foreground/70 hover:bg-white/[0.1] transition-colors" aria-label="TikTok">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
                </a>
                {/* LinkedIn */}
                <a href="https://linkedin.com/company/wccg1045fm" target="_blank" rel="noopener noreferrer" className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/[0.06] text-muted-foreground/70 hover:text-foreground/70 hover:bg-white/[0.1] transition-colors" aria-label="LinkedIn">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
                {/* Twitch */}
                <a href="https://twitch.tv/wccg1045fm" target="_blank" rel="noopener noreferrer" className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/[0.06] text-muted-foreground/70 hover:text-foreground/70 hover:bg-white/[0.1] transition-colors" aria-label="Twitch">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>
                </a>
                {/* Discord */}
                <a href="https://discord.gg/wccg1045fm" target="_blank" rel="noopener noreferrer" className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/[0.06] text-muted-foreground/70 hover:text-foreground/70 hover:bg-white/[0.1] transition-colors" aria-label="Discord">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/></svg>
                </a>
                {/* Spotify */}
                <a href="https://open.spotify.com" target="_blank" rel="noopener noreferrer" className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/[0.06] text-muted-foreground/70 hover:text-foreground/70 hover:bg-white/[0.1] transition-colors" aria-label="Spotify">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Bottom Tab Bar — iHeartRadio-inspired, fixed (hidden on studio editor pages) */}
      <nav className={`fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl ${
        pathname.startsWith("/studio/video-editor") || pathname.startsWith("/studio/podcast") || pathname.startsWith("/studio/audio-editor")
          ? "hidden"
          : ""
      }`}>
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
                    : "text-muted-foreground/70 hover:text-foreground/60"
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
    </SpotCartProvider>
  );
}
