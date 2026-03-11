"use client";

import Link from "next/link";
import {
  Clock,
  ChevronRight,
  Megaphone,
  Music,
  Sun,
} from "lucide-react";
import { AppImage } from "@/components/ui/app-image";

// ─── Gospel Caravan Show Data ─────────────────────────────────────

interface GospelCaravanShow {
  id: string;
  name: string;
  slug: string;
  timeSlot: string;
  description: string;
  host?: string;
  imageUrl: string;
}

const GOSPEL_CARAVAN_SHOWS: GospelCaravanShow[] = [
  {
    id: "show_praise_mix",
    name: "The Praise Mix at 6",
    slug: "praise-mix",
    timeSlot: "Sundays 6:00 - 8:00 AM EST",
    description:
      "Start your Sunday morning with an uplifting mix of gospel music, praise and worship, and inspirational tracks to set the tone for your day of faith.",
    imageUrl:
      "https://wccg1045fm.com/wp-content/uploads/2025/12/praisemix-6.png",
  },
  {
    id: "show_grace_plus_nothing",
    name: "Grace Plus Nothing Ministries",
    slug: "grace-plus-nothing",
    timeSlot: "Sundays 8:00 AM EST",
    description:
      "Apostle Anthony Monds brings messages of faith, grace, and community rooted in the transformative power of God's grace alone.",
    host: "Apostle Anthony Monds",
    imageUrl:
      "https://wccg1045fm.com/wp-content/uploads/2025/10/gpn-1-1024x743-1.png",
  },
  {
    id: "show_encouraging_moment",
    name: "Encouraging Moments",
    slug: "encouraging-moment",
    timeSlot: "Sundays 9:00 AM EST",
    description:
      "Dr. Anthony Haire delivers spiritual encouragement, biblical teaching, and messages of hope to lift and inspire the community.",
    host: "Dr. Anthony Haire",
    imageUrl:
      "https://wccg1045fm.com/wp-content/uploads/2025/10/thm-main-1024x743-1.png",
  },
  {
    id: "show_marvin_sapp",
    name: "The Marvin Sapp Radio Show",
    slug: "marvin-sapp-radio-show",
    timeSlot: "Sundays 10:00 AM - 12:00 PM EST",
    description:
      "Multi-Grammy nominated gospel legend Bishop Marvin Sapp brings inspirational conversation, the best in gospel music, and uplifting messages.",
    host: "Bishop Marvin Sapp",
    imageUrl:
      "https://wccg1045fm.com/wp-content/uploads/2025/10/marvin-sapp12.jpg",
  },
  {
    id: "show_family_fellowship",
    name: "Family Fellowship Worship Center",
    slug: "family-fellowship",
    timeSlot: "Sundays 12:00 PM EST",
    description:
      "Pastor Dr. T.L. Davenport leads Family Fellowship Worship Center with powerful sermons, spiritual guidance, and community worship.",
    host: "Pastor Dr. T.L. Davenport",
    imageUrl:
      "https://wccg1045fm.com/wp-content/uploads/2025/10/ffwc-1024x743-1.png",
  },
  {
    id: "show_mt_pisgah",
    name: "Progressive Missionary Baptist Church",
    slug: "mt-pisgah-mbc",
    timeSlot: "Sundays 1:00 PM EST",
    description:
      "Reverend F. Bernard Fuller delivers the Sunday service broadcast from Progressive Missionary Baptist Church with faith-filled messages and community worship.",
    host: "Reverend F. Bernard Fuller",
    imageUrl:
      "https://wccg1045fm.com/wp-content/uploads/2025/10/progressive-1024x743-1.png",
  },
  {
    id: "show_lewis_chapel",
    name: "Lewis Chapel Missionary Baptist Church",
    slug: "lewis-chapel",
    timeSlot: "Sundays 2:00 PM EST",
    description:
      "Pastor Dr. Christopher Stackhouse, Sr. leads the Lewis Chapel Missionary Baptist Church broadcast every Sunday afternoon with inspirational messages.",
    host: "Pastor Dr. Christopher Stackhouse, Sr.",
    imageUrl:
      "https://wccg1045fm.com/wp-content/uploads/2025/10/lewis-chapel-1024x743-1.png",
  },
];

// ─── Page Component ───────────────────────────────────────────────

export default function GospelCaravanPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#92600a] via-[#b8860b] to-[#6b4226]">
        {/* Decorative glow */}
        <div className="absolute inset-0 opacity-15">
          <div className="absolute top-0 left-1/3 w-96 h-96 bg-amber-200 rounded-full blur-3xl -translate-y-1/2" />
          <div className="absolute bottom-0 right-1/3 w-80 h-80 bg-yellow-300 rounded-full blur-3xl translate-y-1/2" />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 py-14 sm:py-20">
          <div className="flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-4 py-1.5 text-xs font-semibold text-white/80 uppercase tracking-wider mb-5">
              <Sun className="h-3.5 w-3.5" />
              Every Sunday on WCCG 104.5 FM
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight mb-3">
              The Sunday Gospel Caravan
            </h1>
            <p className="text-xl sm:text-2xl text-amber-100/80 font-medium mb-4">
              The Sound of Faith &amp; Inspiration
            </p>
            <p className="text-base text-white/60 max-w-2xl leading-relaxed">
              Every Sunday from 6:00 AM to 3:00 PM, WCCG 104.5 FM transforms
              into your home for gospel, praise, worship, and inspirational
              programming. The Sunday Gospel Caravan features local pastors,
              nationally syndicated shows, and the best in gospel music.
            </p>
          </div>
        </div>
      </div>

      {/* Show Listings */}
      <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
        <div className="flex items-center gap-3 mb-8">
          <Music className="h-5 w-5 text-amber-500" />
          <h2 className="text-xl font-bold text-foreground">
            Sunday Programming Schedule
          </h2>
        </div>

        <div className="space-y-5">
          {GOSPEL_CARAVAN_SHOWS.map((show) => (
            <div
              key={show.id}
              className="group relative overflow-hidden rounded-2xl border border-border bg-foreground/[0.03] hover:border-foreground/[0.15] hover:bg-foreground/[0.05] transition-all"
            >
              <div className="flex flex-col sm:flex-row">
                {/* Show Image */}
                <div className="relative w-full sm:w-56 md:w-64 flex-shrink-0 aspect-[4/3] sm:aspect-auto sm:min-h-[200px] overflow-hidden bg-gradient-to-br from-amber-900/20 to-amber-800/10">
                  <AppImage
                    src={show.imageUrl}
                    alt={show.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 100vw, 256px"
                  />
                </div>

                {/* Show Details */}
                <div className="flex-1 p-5 sm:p-6 flex flex-col justify-center min-w-0">
                  <h3 className="text-lg sm:text-xl font-extrabold text-foreground group-hover:text-amber-400 transition-colors mb-1">
                    {show.name}
                  </h3>

                  {show.host && (
                    <p className="text-sm text-amber-500/80 font-medium mb-2">
                      {show.host}
                    </p>
                  )}

                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-4">
                    {show.description}
                  </p>

                  {/* Action links */}
                  <div className="flex flex-wrap items-center gap-4">
                    <Link
                      href={`/shows/${show.slug}`}
                      className="inline-flex items-center gap-1.5 text-[#74ddc7] text-sm font-semibold hover:text-[#74ddc7]/80 transition-colors"
                    >
                      <span>Program Info</span>
                      <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                    <Link
                      href="/advertise"
                      className="inline-flex items-center gap-1.5 text-muted-foreground text-sm font-medium hover:text-foreground/70 transition-colors"
                    >
                      <Megaphone className="h-3.5 w-3.5" />
                      <span>Advertise on This Show</span>
                    </Link>
                  </div>
                </div>

                {/* Time Slot (right side on desktop) */}
                <div className="hidden md:flex flex-shrink-0 w-48 items-center justify-center border-l border-border/50 p-6">
                  <div className="text-center">
                    <Clock className="h-5 w-5 text-amber-500/60 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-foreground/80 leading-tight">
                      {show.timeSlot}
                    </p>
                  </div>
                </div>
              </div>

              {/* Mobile time slot */}
              <div className="flex md:hidden items-center gap-2 px-5 pb-4 -mt-1">
                <Clock className="h-3.5 w-3.5 text-amber-500/60" />
                <span className="text-xs font-medium text-muted-foreground">
                  {show.timeSlot}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
