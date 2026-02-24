"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import Link from "next/link";
import { AppImage as Image } from "@/components/ui/app-image";
import { Pause, Play, Compass } from "lucide-react";
import { HERO_SHOWS } from "@/data/shows";

const MAIN_STREAM_URL =
  process.env.NEXT_PUBLIC_MAIN_STREAM_URL || "https://stream.wccg.com/main";

const SLIDE_INTERVAL = 8000;

const TICKER_ITEMS = [
  "WCCG 104.5 FM — Fayetteville's Hip Hop Station",
  "Streetz Morning Takeover weekdays 6AM-10AM",
  "Way Up with Angela Yee weekdays 10AM-3PM",
  "Download the mY1045 app for exclusive perks",
  "Submit your music — tap Connect above",
  "Community events, local business directory & more",
];

export function Hero() {
  const { play, pause, isPlaying, currentStream } = useAudioPlayer();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isMainStreamPlaying = isPlaying && currentStream === MAIN_STREAM_URL;
  const currentSlide = HERO_SHOWS[activeIndex];

  const advanceSlide = useCallback(() => {
    setIsTransitioning(true);
    setActiveIndex((prev) => (prev + 1) % HERO_SHOWS.length);
    setTimeout(() => setIsTransitioning(false), 600);
  }, []);

  // Auto-advance timer
  useEffect(() => {
    if (isPaused) return;
    timerRef.current = setTimeout(advanceSlide, SLIDE_INTERVAL);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeIndex, isPaused, advanceSlide]);

  const handleListenLive = () => {
    if (isMainStreamPlaying) {
      pause();
    } else {
      play(MAIN_STREAM_URL, {
        streamName: "WCCG 104.5 FM",
        title: currentSlide.name,
        artist: currentSlide.hostNames,
      });
    }
  };

  return (
    <section
      className="space-y-0"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* ================================================================= */}
      {/* Two-Piece Overlapping Hero                                        */}
      {/* ================================================================= */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.06]">
        {/* Container with fixed height */}
        <div className="relative min-h-[320px] sm:min-h-[400px] md:min-h-[460px]">

          {/* ── LEFT PIECE: Full-width sliding images (sits BEHIND) ── */}
          <div className="absolute inset-0">
            {HERO_SHOWS.map((slide, index) => (
              <div
                key={slide.id}
                className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                  index === activeIndex ? "opacity-100 z-10" : "opacity-0 z-0"
                }`}
              >
                {/* Gradient fallback */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${slide.gradient}`}
                />

                {/* Show image — fills entire hero width, scrolls under right panel */}
                {(slide.imageUrl || slide.showImageUrl) && (
                  <div className="absolute inset-0">
                    <Image
                      src={slide.imageUrl || slide.showImageUrl!}
                      alt={slide.hostNames}
                      fill
                      className="object-cover object-top"
                      sizes="100vw"
                      priority={index === 0}
                    />
                  </div>
                )}
              </div>
            ))}

            {/* Gradient overlay for readability on mobile (full image visible) */}
            <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/80 via-black/30 to-transparent md:hidden" />
          </div>

          {/* ── Show name overlay — visible on left side on desktop ── */}
          <div className="absolute bottom-14 left-0 z-30 px-5 pb-4 md:bottom-4 md:max-w-[45%]">
            <Link
              href={`/shows/${currentSlide.id}`}
              className="group inline-block"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-1">
                Now Playing
              </p>
              <h3 className="text-lg font-black text-white drop-shadow-lg group-hover:text-[#74ddc7] transition-colors">
                {currentSlide.name}
              </h3>
              <p className="text-sm text-white/70 drop-shadow-md">
                {currentSlide.hostNames}
              </p>
            </Link>
          </div>

          {/* ── Dot indicators — bottom-left under show name ── */}
          <div className="absolute bottom-4 left-5 z-30 flex items-center gap-1.5 md:bottom-4">
            {HERO_SHOWS.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  if (index === activeIndex || isTransitioning) return;
                  setIsTransitioning(true);
                  if (timerRef.current) clearTimeout(timerRef.current);
                  setActiveIndex(index);
                  setTimeout(() => setIsTransitioning(false), 600);
                }}
                className={`transition-all duration-300 rounded-full ${
                  index === activeIndex
                    ? "h-2 w-6 bg-[#74ddc7]"
                    : "h-2 w-2 bg-white/40 hover:bg-white/60"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          {/* ── RIGHT PIECE: Content panel with curved edge (sits ON TOP) ── */}
          <div className="absolute inset-0 z-20 flex items-end md:items-stretch pointer-events-none">
            {/* On mobile: content at bottom over gradient */}
            <div className="w-full px-6 py-6 pb-16 md:hidden pointer-events-auto">
              <div className="space-y-4">
                <h1 className="text-2xl sm:text-3xl font-black leading-[1.1] text-white drop-shadow-lg">
                  Hip Hop, Sports,{" "}
                  <span className="text-[#74ddc7]">Reactions</span> And
                  Podcasts.
                </h1>
                <p className="text-sm text-white/60 max-w-sm leading-relaxed drop-shadow">
                  Experience premium digital content wherever you are!
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Button
                    size="default"
                    onClick={handleListenLive}
                    className="group relative overflow-hidden rounded-full border-0 bg-[#dc2626] text-white font-bold shadow-lg shadow-red-500/20 hover:bg-[#b91c1c] px-5"
                  >
                    <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                    {isMainStreamPlaying ? (
                      <>
                        <Pause className="mr-2 h-4 w-4" />
                        Pause Stream
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Now Streaming
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="default"
                    className="rounded-full border-white/20 text-white hover:border-white/40 hover:bg-white/5 px-5"
                    asChild
                  >
                    <Link href="/discover">
                      <Compass className="mr-2 h-4 w-4" />
                      Discover More
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* On desktop: right panel with curved left edge overlapping image */}
            <div className="hidden md:flex md:ml-auto md:w-[50%] lg:w-[48%] relative pointer-events-auto">
              {/* Curved edge SVG — the wave that overlaps onto the image */}
              <div className="absolute top-0 bottom-0 -left-[80px] w-[80px] z-10">
                <svg
                  viewBox="0 0 80 100"
                  preserveAspectRatio="none"
                  className="h-full w-full"
                  fill="#0a0a0f"
                >
                  <path d="M80,0 L80,100 L0,100 C30,85 50,65 55,50 C50,35 30,15 0,0 Z" />
                </svg>
              </div>

              {/* Content area */}
              <div className="relative bg-[#0a0a0f] flex flex-col justify-center px-10 py-12 lg:px-14 w-full">
                {/* Glow orb */}
                <div className="absolute -right-20 -top-20 h-[300px] w-[300px] rounded-full bg-[rgba(116,1,223,0.08)] blur-[100px]" />

                <div className="relative z-10 space-y-6">
                  <h1 className="text-3xl lg:text-4xl xl:text-5xl font-black leading-[1.1] text-white">
                    Hip Hop, Sports,{" "}
                    <span className="text-[#74ddc7]">Reactions</span> And
                    Podcasts.
                  </h1>

                  <p className="text-base lg:text-lg text-white/50 max-w-md leading-relaxed">
                    Experience premium digital content wherever you are!
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <Button
                      size="lg"
                      onClick={handleListenLive}
                      className="group relative overflow-hidden rounded-full border-0 bg-[#dc2626] text-white font-bold shadow-lg shadow-red-500/20 hover:bg-[#b91c1c] hover:shadow-red-500/30 px-6"
                    >
                      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                      {isMainStreamPlaying ? (
                        <>
                          <Pause className="mr-2 h-5 w-5" />
                          Pause Stream
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-5 w-5" />
                          Now Streaming
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      className="rounded-full border-white/20 text-white hover:border-white/40 hover:bg-white/5 px-6"
                      asChild
                    >
                      <Link href="/discover">
                        <Compass className="mr-2 h-4 w-4" />
                        Discover More
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── News Ticker ── */}
        <div className="relative border-t border-white/[0.06] bg-[#0e0e16] flex items-center h-9 overflow-hidden z-30">
          {/* Label */}
          <div className="flex-shrink-0 flex items-center gap-2 px-4 border-r border-white/[0.06] h-full bg-[#dc2626]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-white whitespace-nowrap">
              Platform Updates
            </span>
          </div>

          {/* Scrolling text */}
          <div className="flex-1 overflow-hidden">
            <div className="animate-marquee flex items-center gap-8 whitespace-nowrap">
              {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
                <span
                  key={i}
                  className="text-xs text-white/50 flex items-center gap-8"
                >
                  {item}
                  <span className="text-white/20">•</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
