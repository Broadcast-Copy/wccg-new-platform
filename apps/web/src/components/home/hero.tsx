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
      {/* Split-Panel Hero                                                  */}
      {/* ================================================================= */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.06]">
        <div className="flex flex-col md:flex-row min-h-[320px] sm:min-h-[380px] md:min-h-[440px]">
          {/* ── Left Panel: Rotating Image ── */}
          <div className="relative w-full md:w-1/2 min-h-[240px] md:min-h-0 overflow-hidden">
            {HERO_SHOWS.map((slide, index) => (
              <div
                key={slide.id}
                className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                  index === activeIndex ? "opacity-100 z-10" : "opacity-0 z-0"
                }`}
              >
                {/* Gradient base */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${slide.gradient}`}
                />

                {/* Show image */}
                {(slide.imageUrl || slide.showImageUrl) && (
                  <div className="absolute inset-0">
                    <Image
                      src={slide.imageUrl || slide.showImageUrl!}
                      alt={slide.hostNames}
                      fill
                      className="object-cover object-top"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      priority={index === 0}
                    />
                    {/* Bottom gradient for branding text */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  </div>
                )}
              </div>
            ))}

            {/* Show name overlay at bottom of image */}
            <div className="absolute bottom-0 left-0 right-0 z-20 px-5 pb-4">
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
                <p className="text-sm text-white/70">
                  {currentSlide.hostNames}
                </p>
              </Link>
            </div>

            {/* Dot indicators */}
            <div className="absolute bottom-4 right-5 z-20 flex items-center gap-1.5">
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
          </div>

          {/* ── Right Panel: Content ── */}
          <div className="relative w-full md:w-1/2 bg-[#0a0a0f] flex flex-col justify-center px-6 py-8 md:px-10 md:py-12 lg:px-14">
            {/* Decorative curved shape at top-left (visible on md+) */}
            <div className="hidden md:block absolute top-0 left-0 w-24 h-24">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <path
                  d="M0,0 L0,100 Q0,0 100,0 Z"
                  fill="#0a0a0f"
                  className="drop-shadow-lg"
                />
              </svg>
            </div>

            {/* Glow orb */}
            <div className="absolute -right-20 -top-20 h-[300px] w-[300px] rounded-full bg-[rgba(116,1,223,0.06)] blur-[100px]" />

            <div className="relative z-10 space-y-6">
              <h1 className="text-3xl sm:text-4xl md:text-4xl lg:text-5xl font-black leading-[1.1] text-white">
                Hip Hop, Sports, Reactions And Podcasts.
              </h1>

              <p className="text-base md:text-lg text-white/50 max-w-md leading-relaxed">
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

        {/* ── News Ticker ── */}
        <div className="relative border-t border-white/[0.06] bg-[#0e0e16] flex items-center h-9 overflow-hidden">
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
