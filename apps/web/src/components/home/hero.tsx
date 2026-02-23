"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import Link from "next/link";
import Image from "next/image";
import {
  Pause,
  Play,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  Radio,
  ExternalLink,
} from "lucide-react";
import { HERO_SHOWS, type ShowData } from "@/data/shows";

const MAIN_STREAM_URL =
  process.env.NEXT_PUBLIC_MAIN_STREAM_URL || "https://stream.wccg.com/main";

const SLIDE_INTERVAL = 8000;

export function Hero() {
  const { play, pause, isPlaying, currentStream } = useAudioPlayer();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isMainStreamPlaying = isPlaying && currentStream === MAIN_STREAM_URL;
  const currentSlide = HERO_SHOWS[activeIndex];

  const goToSlide = useCallback(
    (index: number) => {
      if (index === activeIndex || isTransitioning) return;
      setIsTransitioning(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      setActiveIndex(index);
      setTimeout(() => setIsTransitioning(false), 600);
    },
    [activeIndex, isTransitioning]
  );

  const advanceSlide = useCallback(() => {
    setIsTransitioning(true);
    setActiveIndex((prev) => (prev + 1) % HERO_SHOWS.length);
    setTimeout(() => setIsTransitioning(false), 600);
  }, []);

  const prevSlide = useCallback(() => {
    setIsTransitioning(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    setActiveIndex((prev) =>
      prev === 0 ? HERO_SHOWS.length - 1 : prev - 1
    );
    setTimeout(() => setIsTransitioning(false), 600);
  }, []);

  const nextSlide = useCallback(() => {
    setIsTransitioning(true);
    if (timerRef.current) clearTimeout(timerRef.current);
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
      {/* PART 1: Full-Width Banner Carousel                                */}
      {/* ================================================================= */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.06]">
        {/* Banner area — ~450px height */}
        <div className="relative h-[320px] sm:h-[380px] md:h-[440px] lg:h-[480px]">
          {/* Background gradient + image for each slide */}
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

              {/* Host / Show image */}
              {(slide.imageUrl || slide.showImageUrl) && (
                <div className="absolute inset-0">
                  <div className="absolute bottom-0 right-0 h-full w-full md:w-2/3 lg:w-1/2">
                    <Image
                      src={slide.imageUrl || slide.showImageUrl!}
                      alt={slide.hostNames}
                      fill
                      className="object-contain object-bottom opacity-20 md:opacity-50"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      priority={index === 0}
                    />
                  </div>
                  {/* Left gradient overlay for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
                  {/* Bottom fade for detail strip */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                </div>
              )}

              {/* Grid pattern */}
              <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
                  backgroundSize: "60px 60px",
                }}
              />

              {/* Decorative glow orbs */}
              <div className="absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-[rgba(116,221,199,0.06)] blur-[120px]" />
              <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-[rgba(116,1,223,0.08)] blur-[100px]" />
            </div>
          ))}

          {/* ── Overlaid Content ── */}
          <div className="absolute inset-0 z-20 flex flex-col justify-between px-6 py-6 md:px-10 md:py-8">
            {/* Top: Live badge + station ID */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#74ddc7] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#74ddc7]" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-widest text-[#74ddc7]">
                  Live Now
                </span>
              </div>
              <span className="hidden text-sm font-medium text-white/40 sm:inline">
                WCCG 104.5 FM
              </span>
            </div>

            {/* Center: Show info */}
            <div className="max-w-xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(116,1,223,0.3)] bg-[rgba(116,1,223,0.15)] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[rgba(200,170,255,1)]">
                <Clock className="h-3 w-3" />
                {currentSlide.days} {currentSlide.timeSlot}
              </div>

              <h1 className="text-3xl font-black uppercase leading-none tracking-tight text-white drop-shadow-lg md:text-5xl lg:text-6xl">
                {currentSlide.name}
              </h1>

              <div className="flex items-center gap-2 text-[rgba(116,221,199,0.9)]">
                <Users className="h-4 w-4" />
                <p className="text-base font-medium md:text-lg">
                  {currentSlide.hostNames}
                </p>
              </div>

              <p className="hidden max-w-lg text-sm leading-relaxed text-white/50 sm:block md:text-base">
                {currentSlide.tagline}
              </p>
            </div>

            {/* Bottom: CTA buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                onClick={handleListenLive}
                className="group relative overflow-hidden rounded-full border-0 bg-[#74ddc7] text-black font-bold shadow-lg shadow-[rgba(116,221,199,0.25)] hover:bg-[rgba(116,221,199,0.85)] hover:shadow-[rgba(116,221,199,0.4)]"
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
                <Link href={`/shows/${currentSlide.id}`}>
                  View Show
                  <ExternalLink className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* ── Navigation Arrows ── */}
          <button
            onClick={prevSlide}
            className="absolute left-3 top-1/2 z-30 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/60 backdrop-blur-sm transition-all hover:bg-black/60 hover:text-white"
            aria-label="Previous show"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-3 top-1/2 z-30 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/60 backdrop-blur-sm transition-all hover:bg-black/60 hover:text-white"
            aria-label="Next show"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* ── Dot Indicators ── */}
          <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2">
            {HERO_SHOWS.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`transition-all duration-300 rounded-full ${
                  index === activeIndex
                    ? "h-2.5 w-8 bg-[#74ddc7]"
                    : "h-2 w-2 bg-white/30 hover:bg-white/50"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          {/* Auto-advance progress bar */}
          {!isPaused && (
            <div className="absolute bottom-0 left-0 right-0 z-30 h-0.5 bg-white/5">
              <div
                className="h-full bg-[rgba(116,221,199,0.5)]"
                style={{
                  animation: `hero-progress ${SLIDE_INTERVAL}ms linear`,
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* PART 2: Thumbnail Ribbon — Quick Show Selection                   */}
      {/* ================================================================= */}
      <div className="mt-3 relative">
        {/* Gradient overlay edges */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-6 bg-gradient-to-r from-[#0a0a0f] to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-6 bg-gradient-to-l from-[#0a0a0f] to-transparent" />

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide px-1">
          {HERO_SHOWS.map((slide, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={slide.id}
                onClick={() => goToSlide(index)}
                className={`group relative flex-shrink-0 overflow-hidden rounded-xl border transition-all duration-300 text-left ${
                  isActive
                    ? "border-[#74ddc7]/60 ring-1 ring-[#74ddc7]/20 shadow-lg shadow-[rgba(116,221,199,0.08)]"
                    : "border-white/[0.06] hover:border-white/[0.15]"
                }`}
                style={{ width: "180px" }}
              >
                {/* Card BG */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${slide.gradient} ${
                    isActive ? "opacity-80" : "opacity-60"
                  } transition-opacity`}
                />
                {(slide.imageUrl || slide.showImageUrl) && (
                  <div className="absolute inset-0">
                    <Image
                      src={slide.imageUrl || slide.showImageUrl!}
                      alt={slide.name}
                      fill
                      className="object-cover opacity-10"
                      sizes="180px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/30" />
                  </div>
                )}

                {/* Card content */}
                <div className="relative flex items-center gap-3 px-3 py-2.5">
                  {/* Thumbnail */}
                  <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-lg border border-white/10">
                    {slide.imageUrl || slide.showImageUrl ? (
                      <Image
                        src={slide.imageUrl || slide.showImageUrl!}
                        alt={slide.name}
                        fill
                        className="object-cover"
                        sizes="36px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-500/40 to-purple-500/40">
                        <Radio className="h-3.5 w-3.5 text-white/60" />
                      </div>
                    )}
                  </div>

                  {/* Text */}
                  <div className="min-w-0 flex-1">
                    <h3
                      className={`text-[11px] font-bold leading-tight truncate transition-colors ${
                        isActive ? "text-[#74ddc7]" : "text-white/80"
                      }`}
                    >
                      {slide.name}
                    </h3>
                    <p className="mt-0.5 text-[10px] text-white/40 truncate">
                      {slide.hostNames}
                    </p>
                  </div>

                  {/* Active indicator */}
                  {isActive && (
                    <div className="flex-shrink-0">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#74ddc7]/75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#74ddc7]" />
                      </span>
                    </div>
                  )}
                </div>

                {/* Progress bar on active card */}
                {isActive && !isPaused && (
                  <div className="relative h-0.5 w-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full bg-[rgba(116,221,199,0.5)]"
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
    </section>
  );
}
