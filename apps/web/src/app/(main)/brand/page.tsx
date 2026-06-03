"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Copy, Download, Type, Palette, Megaphone, Sparkles, Ban, CircleCheck } from "lucide-react";

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------
interface Swatch { name: string; hex: string; role: string; on?: "light" | "dark" }

const BRAND_COLORS: Swatch[] = [
  { name: "Signal Teal", hex: "#74ddc7", role: "Primary accent · links · CTAs", on: "dark" },
  { name: "Creator Purple", hex: "#7401df", role: "Creator / studio surfaces", on: "light" },
  { name: "Vendor Amber", hex: "#f59e0b", role: "Vendor / commerce highlights", on: "dark" },
  { name: "Alert Red", hex: "#dc2626", role: "Admin / on-air / destructive", on: "light" },
  { name: "Ink", hex: "#0a0a0f", role: "Primary background", on: "light" },
];

const NEUTRALS: Swatch[] = [
  { name: "Card", hex: "#141420", role: "Surfaces / cards", on: "light" },
  { name: "Border", hex: "#26263a", role: "Hairlines / dividers", on: "light" },
  { name: "Muted", hex: "#8b8b9e", role: "Secondary text", on: "dark" },
  { name: "Foreground", hex: "#f5f5f7", role: "Primary text", on: "dark" },
];

const LOGOS: { src: string; label: string; bg: string }[] = [
  { src: "/images/logos/wccg-logo.png", label: "Primary (on dark)", bg: "bg-[#0a0a0f]" },
  { src: "/images/logos/wccg-logo-black.png", label: "Black (on light)", bg: "bg-white" },
  { src: "/images/logos/1045fm-logo.png", label: "104.5 FM lockup", bg: "bg-[#0a0a0f]" },
];

const SUB_BRANDS: { src: string; label: string }[] = [
  { src: "/images/logos/hot-1045-logo.png", label: "Hot 104.5" },
  { src: "/images/logos/soul-1045-logo.png", label: "Soul 104.5" },
  { src: "/images/logos/the-vibe-logo.png", label: "The Vibe" },
  { src: "/images/logos/yard-riddim-logo.png", label: "Yard Riddim" },
  { src: "/images/logos/mix-squad-logo.png", label: "Mix Squad" },
];

const TYPE_SCALE: { label: string; cls: string; sample: string }[] = [
  { label: "Display / H1 · 48–64", cls: "text-5xl font-bold tracking-tight", sample: "The Hip Hop Station" },
  { label: "Heading / H2 · 30", cls: "text-3xl font-bold", sample: "104.5 FM · Fayetteville, NC" },
  { label: "Subhead / H3 · 20", cls: "text-xl font-semibold", sample: "Community-powered radio" },
  { label: "Body · 16", cls: "text-base", sample: "WCCG broadcasts hip hop, R&B, and the culture of Fayetteville, NC — 24/7." },
  { label: "Mono / data · 14", cls: "text-sm font-mono", sample: "DJB_76051.mp3 · 104.5 MHz" },
];

const DOS = [
  "Keep the wordmark on Ink (#0a0a0f) or pure white backgrounds.",
  "Preserve clear space of at least the height of the “W” on all sides.",
  "Use Signal Teal for primary actions; reserve Alert Red for on-air / destructive.",
  "Pair Geist Sans for UI and Geist Mono for codes, timestamps, and frequencies.",
];
const DONTS = [
  "Don’t stretch, skew, rotate, or recolor the wordmark.",
  "Don’t place the logo on busy photos without a scrim.",
  "Don’t mix more than two brand accents in one component.",
  "Don’t recreate the logo in a different typeface.",
];

function ColorCard({ s }: { s: Swatch }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(s.hex); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch { /* noop */ }
  };
  return (
    <button
      onClick={copy}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-left transition hover:border-[#74ddc7]/40"
    >
      <div className="flex h-24 items-end justify-end p-2" style={{ backgroundColor: s.hex }}>
        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold ${s.on === "dark" ? "bg-black/20 text-white" : "bg-white/30 text-black"}`}>
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3 opacity-0 transition group-hover:opacity-100" />}
          {copied ? "Copied" : s.hex.toUpperCase()}
        </span>
      </div>
      <div className="p-3">
        <p className="text-sm font-semibold">{s.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{s.role}</p>
      </div>
    </button>
  );
}

function Section({ icon: Icon, title, kicker, children }: { icon: React.ElementType; title: string; kicker?: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-24">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#74ddc7]/10 text-[#74ddc7]"><Icon className="h-5 w-5" /></div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">{title}</h2>
          {kicker && <p className="text-xs text-muted-foreground">{kicker}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export default function BrandGuidelinesPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 space-y-14">
      {/* Hero */}
      <header className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-[#7401df]/15 via-card to-[#74ddc7]/10 p-8 sm:p-12">
        <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-background/40 px-3 py-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-[#74ddc7]" /> Brand Guidelines
        </p>
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <Image src="/images/logos/wccg-logo.png" alt="WCCG 104.5 FM" width={240} height={120} className="h-20 w-auto object-contain" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">WCCG 104.5 FM</h1>
            <p className="mt-1 text-muted-foreground">The Hip Hop Station — Fayetteville, NC. Visual identity, voice, and usage for the community radio super-app.</p>
          </div>
        </div>
      </header>

      {/* Logo */}
      <Section icon={Sparkles} title="Logo" kicker="The wordmark is the heart of the brand. Give it room to breathe.">
        <div className="grid gap-4 sm:grid-cols-3">
          {LOGOS.map((l) => (
            <div key={l.label} className="rounded-2xl border border-border bg-card p-3">
              <div className={`flex h-48 items-center justify-center rounded-xl ${l.bg}`}>
                <Image src={l.src} alt={l.label} width={360} height={180} className="h-28 w-auto max-w-[84%] object-contain" />
              </div>
              <p className="px-1 pt-3 text-sm font-medium">{l.label}</p>
            </div>
          ))}
        </div>

        {/* 104.5FM wordmark — color treatments (white/black derived from the red source) */}
        <div className="mt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">104.5FM wordmark — color treatments</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Red (primary)", bg: "bg-white", filter: "none" },
              { label: "White (on dark)", bg: "bg-[#0a0a0f]", filter: "brightness(0) invert(1)" },
              { label: "Black (on light)", bg: "bg-white", filter: "brightness(0)" },
            ].map((t) => (
              <div key={t.label} className="rounded-2xl border border-border bg-card p-3">
                <div className={`flex h-32 items-center justify-center rounded-xl ${t.bg}`}>
                  <Image src="/images/logos/1045fm-logo.png" alt={`104.5FM ${t.label}`} width={300} height={120} className="h-16 w-auto max-w-[84%] object-contain" style={{ filter: t.filter }} />
                </div>
                <p className="px-1 pt-3 text-sm font-medium">{t.label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Sub-brands & formats</p>
          <div className="flex flex-wrap gap-3">
            {SUB_BRANDS.map((b) => (
              <div key={b.label} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                <Image src={b.src} alt={b.label} width={60} height={30} className="h-7 w-auto object-contain" />
                <span className="text-sm font-medium">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Color */}
      <Section icon={Palette} title="Color" kicker="Tap any swatch to copy its hex.">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {BRAND_COLORS.map((s) => <ColorCard key={s.hex} s={s} />)}
        </div>
        <p className="mb-3 mt-6 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Neutrals</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {NEUTRALS.map((s) => <ColorCard key={s.hex} s={s} />)}
        </div>
      </Section>

      {/* Typography */}
      <Section icon={Type} title="Typography" kicker="Geist Sans for everything; Geist Mono for codes, times, and frequencies.">
        <div className="divide-y divide-border rounded-2xl border border-border bg-card">
          {TYPE_SCALE.map((t) => (
            <div key={t.label} className="flex flex-col gap-1 p-5 sm:flex-row sm:items-baseline sm:justify-between">
              <p className={`${t.cls} min-w-0 truncate`}>{t.sample}</p>
              <span className="shrink-0 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">{t.label}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Voice */}
      <Section icon={Megaphone} title="Voice & Tone" kicker="How WCCG sounds — on air and on screen.">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { h: "Local & proud", b: "Fayetteville-first. We name neighborhoods, schools, and our own DJs. The 'Ville — Fayetteville &amp; Fort Bragg, NC — is the star." },
            { h: "Hip hop authentic", b: "Speak the culture without trying too hard. Confident, warm, never corporate." },
            { h: "Community-powered", b: "Listeners, vendors, and creators are family. Invite, celebrate, and shout people out." },
          ].map((c) => (
            <div key={c.h} className="rounded-2xl border border-border bg-card p-5">
              <p className="font-semibold text-[#74ddc7]">{c.h}</p>
              <p className="mt-1.5 text-sm text-muted-foreground">{c.b}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Do / Don't */}
      <Section icon={CircleCheck} title="Do & Don’t">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#74ddc7]/30 bg-[#74ddc7]/[0.04] p-5">
            <p className="mb-3 flex items-center gap-2 text-sm font-bold text-[#74ddc7]"><CircleCheck className="h-4 w-4" /> Do</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {DOS.map((d) => <li key={d} className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#74ddc7]" />{d}</li>)}
            </ul>
          </div>
          <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.04] p-5">
            <p className="mb-3 flex items-center gap-2 text-sm font-bold text-red-400"><Ban className="h-4 w-4" /> Don’t</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {DONTS.map((d) => <li key={d} className="flex gap-2"><Ban className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />{d}</li>)}
            </ul>
          </div>
        </div>
      </Section>

      {/* Downloads */}
      <Section icon={Download} title="Assets">
        <div className="flex flex-wrap gap-3">
          {LOGOS.map((l) => (
            <a key={l.src} href={l.src} download className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium transition hover:border-[#74ddc7]/40">
              <Download className="h-4 w-4 text-[#74ddc7]" /> {l.label}
            </a>
          ))}
        </div>
      </Section>
    </div>
  );
}
