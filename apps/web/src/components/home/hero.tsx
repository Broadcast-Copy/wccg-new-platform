"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import Link from "next/link";
import Image from "next/image";
import { Pause, Play, ChevronRight, ChevronDown, Clock, Users, Radio } from "lucide-react";

const MAIN_STREAM_URL =
  process.env.NEXT_PUBLIC_MAIN_STREAM_URL || "https://stream.wccg.com/main";

const SLIDE_INTERVAL = 8000;

interface Slide {
  id: string;
  showTitle: string;
  hosts: string;
  timeSlot: string;
  tagline: string;
  description: string;
  gradient: string;
  image?: string;
  showImage?: string;
}

const SLIDES: Slide[] = [
  {
    id: "streetz-morning-takeover",
    showTitle: "Streetz Morning Takeover",
    hosts: "Yung Joc, Mz Shyneka & Shawty Shawty",
    timeSlot: "Weekdays 6:00 AM - 10:00 AM",
    tagline: "Wake up and take over the streets every weekday morning",
    description:
      "Start your morning with the hottest conversations, celebrity interviews, and the best mix of hip hop and R&B. Yung Joc and the crew bring the energy every weekday morning with their unfiltered take on pop culture, entertainment news, and community topics that matter to Fayetteville.",
    gradient: "from-[#1a0a2e] via-[#16213e] to-[#0f3460]",
    image: "/images/hosts/yung-joc.png",
    showImage: "/images/shows/streetz-morning-takeover.png",
  },
  {
    id: "way-up-angela-yee",
    showTitle: "Way Up with Angela Yee",
    hosts: "Angela Yee",
    timeSlot: "Weekdays 10:00 AM - 2:00 PM",
    tagline: "Real talk, celebrity interviews, and the culture — midday vibes",
    description:
      "Angela Yee brings you the best in midday entertainment with celebrity interviews, relationship advice, trending topics, and the smoothest mix of R&B and hip hop to keep your afternoon flowing.",
    gradient: "from-[#1a0533] via-[#2d1b69] to-[#1a1a2e]",
    image: "/images/hosts/angela-yee.png",
  },
  {
    id: "posted-on-the-corner",
    showTitle: "Posted on The Corner",
    hosts: "Incognito",
    timeSlot: "Weekdays 2:00 PM - 6:00 PM",
    tagline: "Afternoon heat with the hardest hip hop and unfiltered commentary",
    description:
      "Incognito holds it down every afternoon with the hardest hip hop, exclusive freestyles, and raw takes on the culture. From new music drops to local happenings, The Corner is where the streets meet the airwaves.",
    gradient: "from-[#0a1628] via-[#1a0a2e] to-[#162447]",
    image: "/images/hosts/incognito.png",
  },
  {
    id: "bootleg-kev-show",
    showTitle: "The Bootleg Kev Show",
    hosts: "Bootleg Kev",
    timeSlot: "Weekdays 6:00 PM - 10:00 PM",
    tagline: "Exclusive interviews and breaking music from the West Coast king",
    description:
      "Bootleg Kev connects you with the biggest names in hip hop through exclusive interviews, first-listen sessions, and behind-the-scenes industry stories. Tune in for new music and authentic conversations every evening.",
    gradient: "from-[#1a0533] via-[#0d1b2a] to-[#1b2838]",
    showImage: "/images/shows/bootleg-kev-show.png",
  },
  {
    id: "crank-shorty-corleone",
    showTitle: "Crank with Shorty Corleone",
    hosts: "Shorty Corleone",
    timeSlot: "Weeknights 10:00 PM - 2:00 AM",
    tagline: "Late night certified bangers and the best in underground hip hop",
    description:
      "Shorty Corleone turns up the heat late night with certified bangers, underground hip hop, and the best in Southern rap. From trap classics to new fire, Crank is the soundtrack for your night.",
    gradient: "from-[#0f0c29] via-[#302b63] to-[#24243e]",
    image: "/images/hosts/shorty-corleone.png",
    showImage: "/images/shows/crank-corleone.png",
  },
  {
    id: "sunday-snacks",
    showTitle: "Sunday Snacks",
    hosts: "WCCG Gospel Team",
    timeSlot: "Sundays 6:00 AM - 12:00 PM",
    tagline: "Feed your soul with the best in gospel music every Sunday morning",
    description:
      "Start your Sunday right with uplifting gospel music, inspirational messages, and community shoutouts. The WCCG Gospel Team brings you the best in traditional and contemporary gospel to carry you through the week.",
    gradient: "from-[#1a1a2e] via-[#16213e] to-[#0d1b2a]",
  },
];

export function Hero() {
  const { play, pause, isPlaying, currentStream } = useAudioPlayer();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ribbonRef = useRef<HTMLDivElement>(null);

  const isMainStreamPlaying = isPlaying && currentStream === MAIN_STREAM_URL;

  const advanceSlide = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % SLIDES.length);
  }, []);

  useEffect(() => {
    if (isPaused || !isExpanded) return;
    timerRef.current = setTimeout(advanceSlide, SLIDE_INTERVAL);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeIndex, isPaused, isExpanded, advanceSlide]);

  const handleCardClick = (index: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (index === activeIndex && isExpanded) {
      setIsExpanded(false);
    } else {
      setActiveIndex(index);
      setIsExpanded(true);
    }
  };

  const handleListenLive = () => {
    if (isMainStreamPlaying) {
      pause();
    } else {
      play(MAIN_STREAM_URL, {
        streamName: "WCCG 104.5 FM",
        title: "Live Broadcast",
        artist: "WCCG 104.5 FM",
      });
    }
  };

  const currentSlide = SLIDES[activeIndex];

  return (
    <section
      className="space-y-0"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* ================================================================= */}
      {/* Ribbon — Horizontal scrollable strip of show cards                */}
      {/* ================================================================= */}
      <div className="relative" ref={ribbonRef}>
        {/* Gradient overlay edges for scroll hint */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-8 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-8 bg-gradient-to-l from-background to-transparent" />

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-1">
          {SLIDES.map((slide, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={slide.id}
                onClick={() => handleCardClick(index)}
                className={`group relative flex-shrink-0 overflow-hidden rounded-xl border transition-all duration-300 text-left ${
                  isActive && isExpanded
                    ? "border-[rgba(116,221,199,0.6)] ring-2 ring-[rgba(116,221,199,0.2)] shadow-lg shadow-[rgba(116,221,199,0.08)]"
                    : "border-border/30 hover:border-border/60 hover:shadow-md"
                }`}
                style={{ minWidth: "200px", maxWidth: "220px" }}
              >
                {/* Card BG */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${slide.gradient} ${
                    isActive && isExpanded ? "opacity-90" : "opacity-70"
                  } transition-opacity`}
                />
                {(slide.image || slide.showImage) && (
                  <div className="absolute inset-0">
                    <Image
                      src={slide.image || slide.showImage!}
                      alt={slide.showTitle}
                      fill
                      className="object-cover opacity-15"
                      sizes="220px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30" />
                  </div>
                )}

                {/* Card content */}
                <div className="relative flex items-center gap-3 px-4 py-3">
                  {/* Thumbnail */}
                  <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-white/10">
                    {slide.image || slide.showImage ? (
                      <Image
                        src={slide.image || slide.showImage!}
                        alt={slide.showTitle}
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-500/40 to-purple-500/40">
                        <Radio className="h-4 w-4 text-white/60" />
                      </div>
                    )}
                  </div>

                  {/* Text */}
                  <div className="min-w-0 flex-1">
                    <h3
                      className={`text-xs font-bold leading-tight truncate ${
                        isActive && isExpanded
                          ? "text-[rgba(116,221,199,1)]"
                          : "text-white/90"
                      } transition-colors`}
                    >
                      {slide.showTitle}
                    </h3>
                    <p className="mt-0.5 text-[10px] text-white/50 truncate">
                      {slide.hosts}
                    </p>
                  </div>

                  {/* Active dot */}
                  {isActive && isExpanded && (
                    <div className="flex-shrink-0">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[rgba(116,221,199,0.75)]" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-[rgba(116,221,199,1)]" />
                      </span>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                {isActive && isExpanded && !isPaused && (
                  <div className="relative h-0.5 w-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-[rgba(116,221,199,0.6)]"
                      style={{
                        animation: `hero-progress ${SLIDE_INTERVAL}ms linear`,
                      }}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ================================================================= */}
      {/* Expandable Detail Panel                                            */}
      {/* ================================================================= */}
      <div
        className={`overflow-hidden transition-all duration-500 ease-in-out ${
          isExpanded ? "max-h-[600px] opacity-100 mt-3" : "max-h-0 opacity-0 mt-0"
        }`}
      >
        <div className="relative overflow-hidden rounded-2xl border border-border/30">
          {/* Background */}
          <div
            className={`absolute inset-0 bg-gradient-to-br ${currentSlide.gradient} transition-all duration-700 ease-in-out`}
          />
          <div className="absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-[rgba(116,221,199,0.08)] blur-[120px]" />
          <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-[rgba(116,1,223,0.10)] blur-[100px]" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />

          {/* Host / Show image */}
          <div className="pointer-events-none absolute inset-0 transition-opacity duration-700">
            {currentSlide.image && (
              <div className="absolute bottom-0 right-0 h-full w-full md:w-1/2">
                <div className="relative h-full w-full">
                  <Image
                    src={currentSlide.image}
                    alt={currentSlide.hosts}
                    fill
                    className="object-contain object-bottom opacity-30 md:opacity-60"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority={activeIndex === 0}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                </div>
              </div>
            )}
            {currentSlide.showImage && !currentSlide.image && (
              <div className="absolute bottom-0 right-0 h-full w-full md:w-1/2">
                <div className="relative h-full w-full">
                  <Image
                    src={currentSlide.showImage}
                    alt={currentSlide.showTitle}
                    fill
                    className="object-contain object-center opacity-20 md:opacity-50"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="relative z-10 flex min-h-[320px] flex-col justify-between px-6 py-8 md:min-h-[360px] md:px-10 md:py-10">
            {/* Top row: Live badge + collapse button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[rgba(116,221,199,0.75)]" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[rgba(116,221,199,1)]" />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-widest text-[rgba(116,221,199,1)]">
                    Live Now
                  </span>
                </div>
                <span className="hidden text-sm font-medium text-white/40 sm:inline">
                  WCCG 104.5 FM
                </span>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/50 backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white/80"
              >
                <ChevronDown className="h-3 w-3 rotate-180" />
                <span className="hidden sm:inline">Collapse</span>
              </button>
            </div>

            {/* Show info */}
            <div className="mt-6 max-w-xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(116,1,223,0.3)] bg-[rgba(116,1,223,0.15)] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[rgba(200,170,255,1)]">
                <Clock className="h-3 w-3" />
                {currentSlide.timeSlot}
              </div>

              <h1 className="text-3xl font-black uppercase leading-none tracking-tight text-white drop-shadow-lg md:text-5xl lg:text-6xl">
                {currentSlide.showTitle}
              </h1>

              <div className="flex items-center gap-2 text-[rgba(116,221,199,0.9)]">
                <Users className="h-4 w-4" />
                <p className="text-base font-medium md:text-lg">
                  {currentSlide.hosts}
                </p>
              </div>

              <p className="max-w-lg text-sm leading-relaxed text-white/60 md:text-base">
                {currentSlide.description}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  size="lg"
                  onClick={handleListenLive}
                  className="group relative overflow-hidden rounded-full border-0 bg-[rgba(116,221,199,1)] text-black font-bold shadow-lg shadow-[rgba(116,221,199,0.25)] hover:bg-[rgba(116,221,199,0.85)] hover:shadow-[rgba(116,221,199,0.4)]"
                >
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  {isMainStreamPlaying ? (
                    <>
                      <Pause className="mr-2 h-5 w-5" />
                      Pause Stream
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-5 w-5" />
                      Listen Now
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-full border-white/20 bg-white/5 text-white backdrop-blur-sm hover:border-white/40 hover:bg-white/10"
                  asChild
                >
                  <Link href={`/shows`}>
                    View Full Profile
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Bottom tagline */}
            <div className="mt-6">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/30">
                Hip Hop, Sports, Reactions &amp; Podcasts
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Expand prompt when collapsed */}
      {!isExpanded && (
        <div className="mt-2 flex justify-center">
          <button
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-1.5 rounded-full border border-border/30 bg-muted/30 px-4 py-1.5 text-xs text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground hover:border-border/60"
          >
            <ChevronDown className="h-3 w-3" />
            Show Details
          </button>
        </div>
      )}
    </section>
  );
}
