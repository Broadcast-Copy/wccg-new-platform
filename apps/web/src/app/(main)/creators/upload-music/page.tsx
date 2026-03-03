"use client";

import { Music, Upload, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const guidelines = [
  "Original music only — you must own or have rights to the submitted content",
  "Accepted formats: MP3 (320kbps), WAV, or FLAC",
  "Maximum file size: 50 MB per track",
  "Include song title, artist name, genre, and contact information",
  "Clean and explicit versions welcome (label explicit content)",
  "Our programming team reviews all submissions within 2 weeks",
  "Selected tracks may be featured on any of our 6 channels",
  "Submission does not guarantee airplay — selection is at our programming team's discretion",
];

export default function UploadMusicPage() {
  const [formData, setFormData] = useState({
    artistName: "",
    email: "",
    phone: "",
    songTitle: "",
    genre: "",
    link: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-purple-950/50 to-gray-900 border border-border/30">
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7401df] to-[#ec4899] shadow-xl">
              <Music className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Upload Your Music</h1>
              <p className="text-muted-foreground mt-1">Submit your tracks for airplay on WCCG 104.5 FM</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Get Your Music Heard</h2>
        <p className="text-muted-foreground leading-relaxed">
          WCCG 104.5 FM is always looking for fresh talent. Whether you&apos;re a local NC artist or from anywhere
          in the country, submit your music for consideration. Selected tracks get airplay across our 6 channels,
          reaching listeners throughout the Fayetteville market and beyond through our digital streams.
        </p>
      </div>

      {/* Submission Guidelines */}
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Submission Guidelines</h2>
        <ul className="space-y-2">
          {guidelines.map((g, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-[#74ddc7] mt-0.5 shrink-0" />
              {g}
            </li>
          ))}
        </ul>
      </div>

      {/* Submission Form */}
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-foreground mb-4">Submit Your Music</h2>
        {submitted ? (
          <div className="text-center py-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#74ddc7]/10 mx-auto mb-3">
              <Music className="h-7 w-7 text-[#74ddc7]" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Submission Received!</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Our programming team will review your submission. If selected, we&apos;ll contact you within 2 weeks.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-foreground/60 mb-1">Artist / Band Name *</label>
                <input
                  type="text"
                  required
                  value={formData.artistName}
                  onChange={(e) => setFormData({ ...formData, artistName: e.target.value })}
                  className="w-full rounded-lg border border-border bg-foreground/[0.04] px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/20 focus:border-[#74ddc7] focus:outline-none"
                  placeholder="Your artist name"
                />
              </div>
              <div>
                <label className="block text-sm text-foreground/60 mb-1">Song Title *</label>
                <input
                  type="text"
                  required
                  value={formData.songTitle}
                  onChange={(e) => setFormData({ ...formData, songTitle: e.target.value })}
                  className="w-full rounded-lg border border-border bg-foreground/[0.04] px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/20 focus:border-[#74ddc7] focus:outline-none"
                  placeholder="Track title"
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
                <label className="block text-sm text-foreground/60 mb-1">Genre *</label>
                <select
                  required
                  value={formData.genre}
                  onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                  className="w-full rounded-lg border border-border bg-foreground/[0.04] px-4 py-2.5 text-sm text-foreground focus:border-[#74ddc7] focus:outline-none"
                >
                  <option value="" className="bg-card">Select genre</option>
                  <option value="hiphop" className="bg-card">Hip Hop</option>
                  <option value="rnb" className="bg-card">R&B</option>
                  <option value="soul" className="bg-card">Soul</option>
                  <option value="gospel" className="bg-card">Gospel</option>
                  <option value="pop" className="bg-card">Pop</option>
                  <option value="afrobeats" className="bg-card">Afrobeats</option>
                  <option value="reggae" className="bg-card">Reggae / Dancehall</option>
                  <option value="other" className="bg-card">Other</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-foreground/60 mb-1">Link to Music *</label>
              <input
                type="url"
                required
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                className="w-full rounded-lg border border-border bg-foreground/[0.04] px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/20 focus:border-[#74ddc7] focus:outline-none"
                placeholder="SoundCloud, Spotify, Google Drive, Dropbox link, etc."
              />
            </div>
            <div>
              <label className="block text-sm text-foreground/60 mb-1">Additional Info</label>
              <textarea
                rows={3}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full rounded-lg border border-border bg-foreground/[0.04] px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/20 focus:border-[#74ddc7] focus:outline-none resize-none"
                placeholder="Tell us about the song, your background, social media links..."
              />
            </div>
            <div className="flex items-start gap-2 text-xs text-muted-foreground/70">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0" />
              By submitting, you confirm that you own or have rights to this music and grant WCCG 104.5 FM permission to play it on air and digital platforms.
            </div>
            <Button type="submit" className="rounded-full bg-[#7401df] text-white font-bold hover:bg-[#5c00b3] px-8">
              <Upload className="mr-2 h-4 w-4" />
              Submit Music
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
