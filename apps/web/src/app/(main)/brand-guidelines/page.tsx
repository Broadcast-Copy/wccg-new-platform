import { Palette, Download, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Brand Guidelines | WCCG 104.5 FM",
  description: "Official brand guidelines for WCCG 104.5 FM — logos, colors, typography, and usage rules.",
};

const brandColors = [
  { name: "WCCG Teal", hex: "#74ddc7", textColor: "text-[#0a0a0f]" },
  { name: "WCCG Purple", hex: "#7401df", textColor: "text-foreground" },
  { name: "WCCG Red", hex: "#dc2626", textColor: "text-foreground" },
  { name: "Background Dark", hex: "#0a0a0f", textColor: "text-foreground" },
  { name: "Card Dark", hex: "#141420", textColor: "text-foreground" },
  { name: "Text Primary", hex: "#f0f0f5", textColor: "text-[#0a0a0f]" },
];

const channels = [
  { name: "WCCG 104.5 FM", gradient: "from-[#74ddc7] to-[#0d9488]" },
  { name: "Soul 104.5", gradient: "from-[#7401df] to-[#4c1d95]" },
  { name: "Hot 104.5", gradient: "from-[#ef4444] to-[#b91c1c]" },
  { name: "Vibe 104.5", gradient: "from-[#3b82f6] to-[#1d4ed8]" },
  { name: "The Yard", gradient: "from-[#f59e0b] to-[#d97706]" },
  { name: "MixSquad Radio", gradient: "from-[#ec4899] to-[#be185d]" },
];

export default function BrandGuidelinesPage() {
  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-purple-950/50 to-gray-900 border border-border/30">
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#74ddc7] to-[#7401df] shadow-xl">
              <Palette className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Brand Guidelines</h1>
              <p className="text-muted-foreground mt-1">Official WCCG 104.5 FM brand identity and usage rules</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-semibold text-foreground">About Our Brand</h2>
        <p className="text-muted-foreground leading-relaxed">
          WCCG 104.5 FM is Fayetteville&apos;s premier Hip Hop and R&B station, serving Cumberland County and the greater
          North Carolina community since our founding. Our brand represents energy, culture, community, and innovation.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          These guidelines ensure consistent, professional representation of the WCCG brand across all media, platforms,
          and partner communications.
        </p>
      </div>

      {/* Brand Colors */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Brand Colors</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {brandColors.map((color) => (
            <div key={color.hex} className="rounded-xl border border-border overflow-hidden">
              <div
                className={`h-20 flex items-end p-3 ${color.textColor}`}
                style={{ backgroundColor: color.hex }}
              >
                <span className="font-mono text-sm font-bold">{color.hex}</span>
              </div>
              <div className="p-3 bg-card">
                <p className="text-sm font-medium text-foreground">{color.name}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Channel Gradients */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Channel Brand Colors</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {channels.map((ch) => (
            <div
              key={ch.name}
              className={`rounded-xl bg-gradient-to-br ${ch.gradient} p-5 flex items-end h-24`}
            >
              <span className="text-foreground font-bold text-sm">{ch.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Logo Usage */}
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Logo Usage</h2>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p><strong className="text-foreground">Clear Space:</strong> Maintain a minimum clear space around the logo equal to the height of the &ldquo;104.5&rdquo; text.</p>
          <p><strong className="text-foreground">Minimum Size:</strong> The logo should never appear smaller than 80px wide in digital or 1 inch wide in print.</p>
          <p><strong className="text-foreground">Backgrounds:</strong> Use the full-color logo on dark backgrounds. Use the black version on light backgrounds.</p>
          <p><strong className="text-foreground">Do Not:</strong> Stretch, rotate, recolor, add effects, or alter the logo in any way.</p>
        </div>
      </div>

      {/* Typography */}
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Typography</h2>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p><strong className="text-foreground">Primary Font:</strong> Geist Sans — used for headings and body text across digital platforms.</p>
          <p><strong className="text-foreground">Monospace:</strong> Geist Mono — used for technical content and data displays.</p>
          <p><strong className="text-foreground">Fallback:</strong> system-ui, -apple-system, sans-serif</p>
        </div>
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-200/70">
          Use of the WCCG 104.5 FM name, logos, and brand assets requires prior written approval from Carson Communications.
          For brand asset requests or partnership inquiries, please{" "}
          <Link href="/contact" className="text-[#74ddc7] hover:underline">contact us</Link>.
        </p>
      </div>
    </div>
  );
}
