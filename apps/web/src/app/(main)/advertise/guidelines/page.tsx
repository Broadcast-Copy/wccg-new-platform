import { FileCheck, AlertCircle, CheckCircle2, Clock, Volume2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Advertiser Guidelines | WCCG 104.5 FM",
  description: "Technical specifications and creative guidelines for advertising on WCCG 104.5 FM.",
};

const audioSpecs = [
  { label: "Format", value: "MP3 or WAV" },
  { label: "Sample Rate", value: "44.1 kHz" },
  { label: "Bit Rate", value: "128 kbps minimum (320 kbps preferred)" },
  { label: "Channels", value: "Stereo" },
  { label: "Spot Lengths", value: ":15, :30, or :60 seconds" },
  { label: "Max File Size", value: "10 MB" },
];

const digitalSpecs = [
  { label: "Banner Ad (Leaderboard)", value: "728 x 90 px" },
  { label: "Banner Ad (Mobile)", value: "320 x 50 px" },
  { label: "Medium Rectangle", value: "300 x 250 px" },
  { label: "Half Page", value: "300 x 600 px" },
  { label: "Formats", value: "JPG, PNG, GIF, HTML5" },
  { label: "Max File Size", value: "150 KB (static), 200 KB (animated)" },
  { label: "Animation Length", value: "15 seconds max, 3 loops" },
];

export default function AdvertiserGuidelinesPage() {
  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-red-950/50 to-gray-900 border border-border/30">
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-700 shadow-xl">
              <FileCheck className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Advertiser Guidelines</h1>
              <p className="text-muted-foreground mt-1">Technical specs and creative requirements</p>
            </div>
          </div>
        </div>
      </div>

      {/* Audio Specs */}
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-2">
          <Volume2 className="h-5 w-5 text-[#74ddc7]" />
          <h2 className="text-xl font-semibold text-foreground">Audio Spot Specifications</h2>
        </div>
        <div className="grid gap-2">
          {audioSpecs.map((spec) => (
            <div key={spec.label} className="flex justify-between items-center py-2 border-b border-white/[0.04]">
              <span className="text-sm text-muted-foreground">{spec.label}</span>
              <span className="text-sm text-foreground font-medium">{spec.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Digital Specs */}
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Digital Ad Specifications</h2>
        <div className="grid gap-2">
          {digitalSpecs.map((spec) => (
            <div key={spec.label} className="flex justify-between items-center py-2 border-b border-white/[0.04]">
              <span className="text-sm text-muted-foreground">{spec.label}</span>
              <span className="text-sm text-foreground font-medium">{spec.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Content Guidelines */}
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Content Guidelines</h2>
        <ul className="space-y-2">
          {[
            "All ads must comply with FCC regulations and FTC advertising guidelines",
            "No misleading, deceptive, or false claims",
            "Political advertising must include required disclaimers and sponsorship identification",
            "Ads for alcohol, gambling, or tobacco must comply with applicable state and federal regulations",
            "WCCG reserves the right to reject any ad that conflicts with our community standards",
            "Live reads and DJ endorsements must be clearly identified as sponsored content",
            "All creative must be submitted at least 48 hours before scheduled airdate",
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-[#74ddc7] mt-0.5 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Deadlines */}
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-[#74ddc7]" />
          <h2 className="text-xl font-semibold text-foreground">Submission Deadlines</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { type: "Audio Spots", deadline: "48 hours before airdate" },
            { type: "Digital Banners", deadline: "72 hours before launch" },
            { type: "Live Read Scripts", deadline: "24 hours before airtime" },
            { type: "Event Sponsorship", deadline: "2 weeks before event" },
          ].map((item) => (
            <div key={item.type} className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-4">
              <h3 className="font-medium text-foreground text-sm">{item.type}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{item.deadline}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild className="rounded-full bg-[#74ddc7] text-[#0a0a0f] font-bold hover:bg-[#5fc4b0]">
          <Link href="/advertise/media-kit">View Media Kit</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full border-white/20 text-foreground hover:bg-white/5">
          <Link href="/advertise">Contact Advertising Team</Link>
        </Button>
      </div>
    </div>
  );
}
