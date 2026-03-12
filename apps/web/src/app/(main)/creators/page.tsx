"use client";

import { Mic, Music, Podcast, Video, Palette, TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const features = [
  {
    icon: Music,
    title: "Music Submission",
    description: "Submit your tracks directly to our programming team for airplay consideration across all 6 channels.",
  },
  {
    icon: Podcast,
    title: "Podcast Hosting",
    description: "Launch your podcast on the mY1045 platform with distribution, analytics, and promotion support.",
  },
  {
    icon: Video,
    title: "Video Content",
    description: "Create and share video content through our YouTube channels and digital platforms.",
  },
  {
    icon: Mic,
    title: "On-Air Features",
    description: "Get featured on live shows through interviews, live performances, and artist spotlights.",
  },
  {
    icon: Palette,
    title: "Brand Building",
    description: "Leverage our audience and platforms to build your personal brand and grow your following.",
  },
  {
    icon: TrendingUp,
    title: "Analytics & Growth",
    description: "Track your content performance with detailed analytics on plays, engagement, and audience growth.",
  },
];

export default function CreatorsPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    type: "",
    portfolio: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 1000);
  };

  const handleReset = () => {
    setFormData({ name: "", email: "", type: "", portfolio: "", message: "" });
    setSubmitted(false);
  };

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-purple-950/50 to-gray-900 border border-border/30">
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7401df] to-[#3b82f6] shadow-xl">
              <Mic className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Become a Creator</h1>
              <p className="text-muted-foreground mt-1">Create, share, and grow with WCCG 104.5 FM</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-semibold text-foreground">The WCCG Creator Program</h2>
        <p className="text-muted-foreground leading-relaxed">
          WCCG 104.5 FM&apos;s Creator Program empowers local artists, podcasters, DJs, and content creators with the tools
          and platform to reach a wider audience. Whether you&apos;re a musician looking for airplay, a podcaster launching
          your first show, or a DJ wanting to share your mixes — we&apos;ve built a home for your content.
        </p>
      </div>

      {/* Features */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="rounded-xl border border-border bg-card p-5 transition-all hover:border-input">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#7401df]/10 mb-3">
              <f.icon className="h-5 w-5 text-[#7401df]" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">{f.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { href: "/creators/podcast", label: "Podcast & Launch", desc: "Start your podcast on mY1045" },
          { href: "/creators/upload-music", label: "Upload Music", desc: "Submit tracks for airplay" },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-input flex items-center justify-between"
          >
            <div>
              <h3 className="font-semibold text-foreground group-hover:text-[#74ddc7] transition-colors">{link.label}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{link.desc}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-foreground/20 group-hover:text-[#74ddc7] transition-colors" />
          </Link>
        ))}
      </div>

      {/* My Uploads Tracker */}
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Music className="h-5 w-5 text-[#7401df]" />
            My Uploads
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Track songs you&apos;ve submitted to WCCG for airplay consideration.
        </p>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Song Title</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Artist</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground hidden sm:table-cell">Status</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground hidden md:table-cell">Submitted</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Music className="h-8 w-8 text-muted-foreground/30" />
                    <p>No uploads yet</p>
                    <p className="text-xs">Submit your music through the Upload Music page to see them tracked here.</p>
                    <Link href="/creators/upload-music" className="mt-2 text-xs font-medium text-[#74ddc7] hover:text-[#74ddc7]/80 transition-colors">
                      Upload Music →
                    </Link>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Application Form */}
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-foreground mb-4">Apply to the Creator Program</h2>
        {submitted ? (
          <div className="text-center py-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#7401df]/10 mx-auto mb-3">
              <Mic className="h-7 w-7 text-[#7401df]" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Application Submitted!</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Our creator team will review your application and get back to you within 5 business days.
            </p>
            <Button
              onClick={handleReset}
              className="mt-4 rounded-full bg-[#7401df] text-white font-bold hover:bg-[#5c00b3] px-8"
            >
              Submit Another Application
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-foreground/60 mb-1">Name / Artist Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-border bg-foreground/[0.04] px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/20 focus:border-[#74ddc7] focus:outline-none"
                  placeholder="Your name or artist name"
                />
              </div>
              <div>
                <label className="block text-sm text-foreground/60 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg border border-border bg-foreground/[0.04] px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/20 focus:border-[#74ddc7] focus:outline-none"
                  placeholder="you@email.com"
                />
              </div>
              <div>
                <label className="block text-sm text-foreground/60 mb-1">Creator Type *</label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full rounded-lg border border-border bg-foreground/[0.04] px-4 py-2.5 text-sm text-foreground focus:border-[#74ddc7] focus:outline-none"
                >
                  <option value="" className="bg-card">Select type</option>
                  <option value="musician" className="bg-card">Musician / Artist</option>
                  <option value="dj" className="bg-card">DJ</option>
                  <option value="podcaster" className="bg-card">Podcaster</option>
                  <option value="video" className="bg-card">Video Creator</option>
                  <option value="writer" className="bg-card">Writer / Blogger</option>
                  <option value="other" className="bg-card">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-foreground/60 mb-1">Portfolio / Website</label>
                <input
                  type="url"
                  value={formData.portfolio}
                  onChange={(e) => setFormData({ ...formData, portfolio: e.target.value })}
                  className="w-full rounded-lg border border-border bg-foreground/[0.04] px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/20 focus:border-[#74ddc7] focus:outline-none"
                  placeholder="https://your-portfolio.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-foreground/60 mb-1">Tell us about your work</label>
              <textarea
                rows={4}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full rounded-lg border border-border bg-foreground/[0.04] px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/20 focus:border-[#74ddc7] focus:outline-none resize-none"
                placeholder="Describe your content, genre, audience, and what you'd like to do with WCCG..."
              />
            </div>
            <Button type="submit" disabled={submitting} className="rounded-full bg-[#7401df] text-white font-bold hover:bg-[#5c00b3] px-8 disabled:opacity-60">
              {submitting ? "Submitting..." : "Submit Application"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
