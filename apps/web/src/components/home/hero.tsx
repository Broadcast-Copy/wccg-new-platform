"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import Link from "next/link";
import Image from "next/image";
import { Pause, Play, Radio, ChevronRight } from "lucide-react";

const MAIN_STREAM_URL =
  process.env.NEXT_PUBLIC_MAIN_STREAM_URL || "https://stream.wccg.com/main";

const SLIDE_INTERVAL = 5000;

interface Slide {
  id: string;
  showTitle: string;
  hosts: string;
  timeSlot: string;
  tagline: string;
  /** Gradient used as the slide background */
  gradient: string;
  /** Optional host/show image path (served from /public) */
  image?: string;
  /** Optional show logo image */
  showImage?: string;
}

const SLIDES: Slide[] = [
  {
    id: "streetz-morning-takeover",
    showTitle: "Streetz Morning Takeover",
    hosts: "Yung Joc, Mz Shyneka & Shawty Shawty",
    timeSlot: "6 AM - 10 AM",
    tagline: "Wake up and take over the streets every weekday morning",
    gradient:
      "from-[#1a0a2e] via-[#16213e] to-[#0f3460]",
    image: "/images/hosts/yung-joc.png",
    showImage: "/images/shows/streetz-morning-takeover.png",
  },
  {
    id: "way-up-angela-yee",
    showTitle: "Way Up with Angela Yee",
    hosts: "Angela Yee",
    timeSlot: "10 AM - 2 PM",
    tagline: "Real talk, celebrity interviews, and the culture — midday vibes",
    gradient:
      "from-[#1a0533] via-[#2d1b69] to-[#1a1a2e]",
    image: "/images/hosts/angela-yee.png",
  },
  {
    id: "posted-on-the-corner",
    showTitle: "Posted on The Corner",
    hosts: "Incognito",
    timeSlot: "2 PM - 6 PM",
    tagline: "Afternoon heat with the hardest hip hop and unfiltered commentary",
    gradient:
      "from-[#0a1628] via-[#1a0a2e] to-[#162447]",
    image: "/images/hosts/incognito.png",
  },
  {
    id: "bootleg-kev-show",
    showTitle: "The Bootleg Kev Show",
    hosts: "Bootleg Kev",
    timeSlot: "6 PM - 10 PM",
    tagline: "Exclusive interviews and breaking music from the West Coast king",
    gradient:
      "from-[#1a0533] via-[#0d1b2a] to-[#1b2838]",
    showImage: "/images/shows/bootleg-kev-show.png",
  },
  {
    id: "crank-shorty-corleone",
    showTitle: "Crank",
    hosts: "Shorty Corleone",
    timeSlot: "10 PM - 2 AM",
    tagline: "Late night certified bangers and the best in underground hip hop",
    gradient:
      "from-[#0f0c29] via-[#302b63] to-[#24243e]",
    image: "/images/hosts/shorty-corleone.png",
    showImage: "/images/shows/crank-corleone.png",
  },
];

export function Hero() {
  const { play, pause, isPlaying, currentStream } = useAudioPlayer();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isMainStreamPlaying = isPlaying && currentStream === MAIN_STREAM_URL;

  // --- slide auto-advance logic ---
  const goToSlide = useCallback(
    (index: number) => {
      if (index === activeIndex) return;
      setIsTransitioning(true);
      // Wait for the fade-out, then swap the slide and fade-in
      setTimeout(() => {
        setActiveIndex(index);
        // Small delay to allow the DOM to update before triggering fade-in
        requestAnimationFrame(() => {
          setIsTransitioning(false);
        });
      }, 400);
    },
    [activeIndex],
  );

  const advanceSlide = useCallback(() => {
    goToSlide((activeIndex + 1) % SLIDES.length);
  }, [activeIndex, goToSlide]);

  useEffect(() => {
    if (isPaused) return;
    timerRef.current = setTimeout(advanceSlide, SLIDE_INTERVAL);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeIndex, isPaused, advanceSlide]);

  const handleDotClick = (index: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    goToSlide(index);
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
      className="relative w-full overflow-hidden rounded-2xl"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Background layer: gradient + optional images                        */}
      {/* ------------------------------------------------------------------ */}
      <div
        className={`
          absolute inset-0 bg-gradient-to-br ${currentSlide.gradient}
          transition-opacity duration-500 ease-in-out
          ${isTransitioning ? "opacity-0" : "opacity-100"}
        `}
      >
        {/* Ambient glow — teal */}
        <div className="absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-[rgba(116,221,199,0.08)] blur-[120px]" />
        {/* Ambient glow — purple */}
        <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-[rgba(116,1,223,0.10)] blur-[100px]" />
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Host / Show image (right side on desktop, behind text on mobile)    */}
      {/* ------------------------------------------------------------------ */}
      <div
        className={`
          pointer-events-none absolute inset-0
          transition-opacity duration-500 ease-in-out
          ${isTransitioning ? "opacity-0" : "opacity-100"}
        `}
      >
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
              {/* Gradient overlay to blend into the background */}
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
                priority={activeIndex === 0}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Content                                                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="relative z-10 flex min-h-[420px] flex-col justify-between px-6 py-10 md:min-h-[480px] md:px-12 md:py-14 lg:min-h-[520px]">
        {/* Top: Station branding */}
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

        {/* Middle: Slide content */}
        <div
          className={`
            mt-6 max-w-xl space-y-4
            transition-all duration-500 ease-in-out
            ${isTransitioning ? "translate-y-3 opacity-0" : "translate-y-0 opacity-100"}
          `}
        >
          {/* Time slot pill */}
          <div className="inline-flex items-center gap-2 rounded-md border border-[rgba(116,1,223,0.3)] bg-[rgba(116,1,223,0.15)] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[rgba(200,170,255,1)]">
            <Radio className="h-3 w-3" />
            {currentSlide.timeSlot}
          </div>

          {/* Show title */}
          <h1 className="text-3xl font-black uppercase leading-none tracking-tight text-white drop-shadow-lg md:text-5xl lg:text-6xl">
            {currentSlide.showTitle}
          </h1>

          {/* Hosts */}
          <p className="text-base font-medium text-[rgba(116,221,199,0.9)] md:text-lg">
            {currentSlide.hosts}
          </p>

          {/* Tagline */}
          <p className="max-w-md text-sm leading-relaxed text-white/60 md:text-base">
            {currentSlide.tagline}
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              size="lg"
              onClick={handleListenLive}
              className="group relative overflow-hidden border-0 bg-[rgba(116,221,199,1)] text-black font-bold shadow-lg shadow-[rgba(116,221,199,0.25)] hover:bg-[rgba(116,221,199,0.85)] hover:shadow-[rgba(116,221,199,0.4)]"
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
                  Listen Live
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-white/20 bg-white/5 text-white backdrop-blur-sm hover:border-white/40 hover:bg-white/10"
              asChild
            >
              <Link href="/discover">
                Discover More
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Bottom: Tagline + dot indicators */}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          {/* Station tagline */}
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/30">
            Hip Hop, Sports, Reactions &amp; Podcasts
          </p>

          {/* Slide indicators */}
          <div className="flex items-center gap-2">
            {SLIDES.map((slide, index) => (
              <button
                key={slide.id}
                onClick={() => handleDotClick(index)}
                aria-label={`Go to slide: ${slide.showTitle}`}
                className={`
                  group relative h-2 rounded-full transition-all duration-300 ease-out
                  ${
                    index === activeIndex
                      ? "w-8 bg-[rgba(116,221,199,1)]"
                      : "w-2 bg-white/25 hover:bg-white/50"
                  }
                `}
              >
                {/* Active indicator progress bar */}
                {index === activeIndex && !isPaused && (
                  <span
                    className="absolute inset-0 rounded-full bg-white/30"
                    style={{
                      animation: `hero-progress ${SLIDE_INTERVAL}ms linear`,
                    }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

    </section>
  );
}
