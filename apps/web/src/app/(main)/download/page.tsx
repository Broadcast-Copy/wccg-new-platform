"use client";

import {
  Radio,
  Star,
  Music,
  Trophy,
  Smartphone,
  QrCode,
  Share2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShareCard } from "@/components/social/share-card";
import { getShareUrl, generateShareText } from "@/lib/share";
import Link from "next/link";
import Image from "next/image";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const FEATURES = [
  {
    icon: Radio,
    title: "Listen Live",
    description: "6 live streams — Hip Hop, R&B, Soul, Gospel, and more, 24/7.",
  },
  {
    icon: Star,
    title: "Earn Points",
    description: "Get mY1045 points every time you listen, check in, or engage.",
  },
  {
    icon: Music,
    title: "Request Songs",
    description: "Submit song requests straight from the app to our DJs on air.",
  },
  {
    icon: Trophy,
    title: "Win Prizes",
    description: "Enter contests and giveaways for tickets, merch, and cash prizes.",
  },
];

const QR_URL =
  "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://app.wccg1045fm.com/download";

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function DownloadPage() {
  const shareUrl = getShareUrl("/download", "download_page", "social", "app_download");
  const { title: shareTitle, text: shareText } = generateShareText("general");

  return (
    <div className="space-y-12">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-teal-950/40 to-gray-900 border border-border/30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(20,184,166,.12),transparent_60%)]" />
        <div className="relative px-6 py-14 sm:px-10 sm:py-20 text-center space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 shadow-xl">
            <Smartphone className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight">
            Get{" "}
            <span className="bg-gradient-to-r from-teal-300 to-teal-100 bg-clip-text text-transparent">
              mY1045
            </span>
          </h1>
          <p className="text-base sm:text-lg text-white/70 max-w-lg mx-auto">
            WCCG 104.5 FM in your pocket. Listen live, earn points, request
            songs, and win prizes — all from your phone.
          </p>
          <Badge
            variant="secondary"
            className="bg-teal-500/10 text-teal-300 border-teal-500/20 text-sm"
          >
            Free &middot; No App Store Needed
          </Badge>
          <div className="pt-2">
            <Link href="/">
              <Button className="rounded-full bg-teal-500 hover:bg-teal-400 text-white font-bold px-10 py-3 text-base w-full sm:w-auto">
                Open App
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold text-foreground text-center">
          Everything You Need
        </h2>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <Card
              key={f.title}
              className="border-border bg-card hover:border-input transition-all"
            >
              <CardContent className="p-5 text-center space-y-3">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-teal-500/10">
                  <f.icon className="h-5 w-5 text-teal-400" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">
                  {f.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {f.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── QR Code (desktop) ── */}
      <section className="hidden md:block">
        <Card className="border-border bg-card max-w-md mx-auto">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-teal-500/10">
              <QrCode className="h-5 w-5 text-teal-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              Scan to Open on Your Phone
            </h3>
            <p className="text-sm text-muted-foreground">
              Point your camera at the QR code to open mY1045 instantly.
            </p>
            <div className="mx-auto w-[200px] h-[200px] rounded-xl overflow-hidden bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={QR_URL}
                alt="QR code to download mY1045 app"
                width={200}
                height={200}
                className="w-full h-full"
              />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── Share ── */}
      <section className="max-w-md mx-auto space-y-4">
        <div className="flex items-center justify-center gap-2 text-sm font-medium text-foreground">
          <Share2 className="h-4 w-4 text-muted-foreground" />
          Share with Friends
        </div>
        <ShareCard
          title={shareTitle}
          text={shareText}
          url={shareUrl}
          variant="card"
        />
      </section>

      {/* ── PWA Install Hint ── */}
      <section className="text-center py-6 space-y-3">
        <h2 className="text-lg font-bold text-foreground">
          Install as an App
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          On your phone, tap the browser menu and select &quot;Add to Home
          Screen&quot; to install mY1045 as a native-feeling app — no app store
          required.
        </p>
        <Badge
          variant="outline"
          className="text-xs text-muted-foreground border-border"
        >
          Works on iOS, Android &amp; Desktop
        </Badge>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="text-center py-8 space-y-4">
        <h2 className="text-2xl font-bold text-foreground">
          Start Listening Now
        </h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          No downloads, no sign-ups required. Just tap and listen.
        </p>
        <Link href="/">
          <Button className="rounded-full bg-teal-500 hover:bg-teal-400 text-white font-bold px-10 py-3 text-base">
            Open mY1045
          </Button>
        </Link>
      </section>
    </div>
  );
}
