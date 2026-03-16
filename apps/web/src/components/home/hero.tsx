"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AppImage as Image } from "@/components/ui/app-image";
import { ArrowDownRight } from "lucide-react";
import { HERO_SHOWS, type ShowData } from "@/data/shows";
import { useStreamPlayer } from "@/components/player/stream-player-overlay";

const SLIDE_INTERVAL = 8000;

/** Custom hero images (non-show slides) */
interface HeroImageSlide {
  id: string;
  imageUrl: string;
  label: string;
  category?: string;
  linkHref: string;
}

const HERO_IMAGES: HeroImageSlide[] = [
  {
    id: "duke-basketball-hero",
    imageUrl: "/images/sports/duke-main.png",
    label: "Duke Basketball on WCCG 104.5 FM",
    category: "Duke Sports",
    linkHref: "/sports/duke-basketball",
  },
  {
    id: "duke-football-hero",
    imageUrl: "/images/sports/duke-main1.png",
    label: "Duke Football on WCCG 104.5 FM",
    category: "Duke Sports",
    linkHref: "/sports/duke-football",
  },
  {
    id: "riich-villianz-hero",
    imageUrl: "/images/head-01.png",
    label: "Riich Villianz Radio",
    category: "Podcast",
    linkHref: "/shows/show_riich_villianz",
  },
];

type HeroSlide =
  | { type: "show"; data: ShowData }
  | { type: "image"; data: HeroImageSlide };

/** Interleave show slides with image slides */
const ALL_HERO_SLIDES: HeroSlide[] = (() => {
  const shows = HERO_SHOWS.map((s): HeroSlide => ({ type: "show", data: s }));
  const images = HERO_IMAGES.map((img): HeroSlide => ({ type: "image", data: img }));
  const result: HeroSlide[] = [];
  const max = Math.max(shows.length, images.length);
  for (let i = 0; i < max; i++) {
    if (i < shows.length) result.push(shows[i]);
    if (i < images.length) result.push(images[i]);
  }
  return result;
})();

const TICKER_ITEMS = [
  "WCCG 104.5 FM — Fayetteville's Hip Hop Station",
  "Streetz Morning Takeover weekdays 6AM-10AM",
  "Way Up with Angela Yee weekdays 10AM-3PM",
  "Download the mY1045 app for exclusive perks",
  "Submit your music — tap Connect above",
  "Community events, local business directory & more",
];

export function Hero() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentHeroSlide = ALL_HERO_SLIDES[activeIndex];
  // For the overlay text: show slides use show data, image slides use their label
  const currentShowSlide = currentHeroSlide.type === "show" ? currentHeroSlide.data : null;

  const advanceSlide = useCallback(() => {
    setIsTransitioning(true);
    setActiveIndex((prev) => (prev + 1) % ALL_HERO_SLIDES.length);
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

  const { open: openStreamPlayer } = useStreamPlayer();

  const handleListenLive = () => {
    openStreamPlayer();
  };

  const goToSlide = (index: number) => {
    if (index === activeIndex || isTransitioning) return;
    setIsTransitioning(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    setActiveIndex(index);
    setTimeout(() => setIsTransitioning(false), 600);
  };

  return (
    <section
      className="space-y-0"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* ================================================================= */}
      {/* Two-Card Hero — matching wccg1045fm.com original design           */}
      {/* Left: sliding image card | Right: content card with curve         */}
      {/* ================================================================= */}

      {/* Mobile: stacked layout */}
      <div className="md:hidden">
        <div className="relative overflow-hidden rounded-2xl border border-border">
          {/* Sliding image */}
          <div className="relative aspect-[4/3]">
            {ALL_HERO_SLIDES.map((heroSlide, index) => (
              <div
                key={heroSlide.data.id}
                className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                  index === activeIndex ? "opacity-100 z-10" : "opacity-0 z-0"
                }`}
              >
                {heroSlide.type === "show" ? (
                  <>
                    <div className={`absolute inset-0 bg-gradient-to-br ${heroSlide.data.gradient}`} />
                    {(heroSlide.data.imageUrl || heroSlide.data.showImageUrl) && (
                      <Image
                        src={heroSlide.data.imageUrl || heroSlide.data.showImageUrl!}
                        alt={heroSlide.data.hostNames}
                        fill
                        className="object-contain object-center"
                        sizes="100vw"
                        priority={index === 0}
                      />
                    )}
                  </>
                ) : (
                  <Image
                    src={heroSlide.data.imageUrl}
                    alt={heroSlide.data.label}
                    fill
                    className="object-cover object-center"
                    sizes="100vw"
                    priority={index === 0}
                  />
                )}
              </div>
            ))}

            {/* Bottom gradient for text readability */}
            <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

            {/* Show info overlay */}
            <div className="absolute bottom-0 left-0 right-0 z-30 px-5 pb-5">
              {currentShowSlide ? (
                <Link href={`/shows/${currentShowSlide.id}`} className="group inline-block mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-0.5">Now Playing</p>
                  <h3 className="text-base font-black text-white group-hover:text-[#74ddc7] transition-colors">
                    {currentShowSlide.name}
                  </h3>
                  <p className="text-xs text-white/60">{currentShowSlide.hostNames}</p>
                </Link>
              ) : currentHeroSlide.type === "image" ? (
                <Link href={currentHeroSlide.data.linkHref} className="group inline-block mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#74ddc7] mb-0.5">{currentHeroSlide.data.category || "Featured"}</p>
                  <h3 className="text-base font-black text-white group-hover:text-[#74ddc7] transition-colors">
                    {currentHeroSlide.data.label}
                  </h3>
                </Link>
              ) : null}

              {/* Dots */}
              <div className="flex items-center gap-1.5">
                {ALL_HERO_SLIDES.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
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
          </div>

          {/* Content below image */}
          <div className="bg-sidebar px-5 py-6 space-y-4">
            <h1 className="text-2xl font-black leading-[1.1] text-foreground">
              Hip Hop, Sports, Reactions And Podcasts.
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Experience premium digital content wherever you are!
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="default"
                onClick={handleListenLive}
                className="group relative overflow-hidden rounded-full border-0 bg-[#dc2626] text-white font-bold shadow-lg shadow-red-500/20 hover:bg-[#b91c1c] px-5"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                Now Streaming
                <ArrowDownRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="default"
                className="rounded-full border-white/20 text-foreground hover:border-white/40 hover:bg-white/5 px-5"
                asChild
              >
                <Link href="/discover">
                  Discover More
                  <ArrowDownRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* ── News Ticker (mobile) ── */}
          <div className="border-t border-border flex items-center h-9 overflow-hidden">
            <div className="flex-shrink-0 flex items-center gap-2 px-4 border-r border-border h-full bg-foreground/[0.06]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-foreground/70 whitespace-nowrap">
                Platform Updates
              </span>
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="animate-marquee flex items-center gap-8 whitespace-nowrap">
                {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
                  <span
                    key={i}
                    className="text-xs text-muted-foreground flex items-center gap-8"
                  >
                    {item}
                    <span className="text-foreground/20">•</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop: two side-by-side rounded rectangles */}
      <div className="hidden md:grid md:grid-cols-[2fr_3fr] gap-4">
        {/* ── LEFT CARD: Sliding image ── */}
        <div className="relative overflow-hidden rounded-2xl border border-border aspect-[4/3] lg:aspect-auto lg:min-h-[460px]">
          {ALL_HERO_SLIDES.map((heroSlide, index) => (
            <div
              key={heroSlide.data.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                index === activeIndex ? "opacity-100 z-10" : "opacity-0 z-0"
              }`}
            >
              {heroSlide.type === "show" ? (
                <>
                  <div className={`absolute inset-0 bg-gradient-to-br ${heroSlide.data.gradient}`} />
                  {(heroSlide.data.imageUrl || heroSlide.data.showImageUrl) && (
                    <Image
                      src={heroSlide.data.imageUrl || heroSlide.data.showImageUrl!}
                      alt={heroSlide.data.hostNames}
                      fill
                      className="object-contain object-center"
                      sizes="50vw"
                      priority={index === 0}
                    />
                  )}
                </>
              ) : (
                <Image
                  src={heroSlide.data.imageUrl}
                  alt={heroSlide.data.label}
                  fill
                  className="object-cover object-center"
                  sizes="50vw"
                  priority={index === 0}
                />
              )}
            </div>
          ))}

          {/* Bottom gradient for show info */}
          <div className="absolute inset-x-0 bottom-0 h-1/3 z-20 bg-gradient-to-t from-black/80 to-transparent" />

          {/* Show info + dots */}
          <div className="absolute bottom-0 left-0 right-0 z-30 px-6 pb-5">
            {currentShowSlide ? (
              <Link href={`/shows/${currentShowSlide.id}`} className="group inline-block mb-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-0.5">Now Playing</p>
                <h3 className="text-lg font-black text-white drop-shadow-lg group-hover:text-[#74ddc7] transition-colors">
                  {currentShowSlide.name}
                </h3>
                <p className="text-sm text-white/60 drop-shadow-md">{currentShowSlide.hostNames}</p>
              </Link>
            ) : currentHeroSlide.type === "image" ? (
              <Link href={currentHeroSlide.data.linkHref} className="group inline-block mb-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#74ddc7] mb-0.5">{currentHeroSlide.data.category || "Featured"}</p>
                <h3 className="text-lg font-black text-white drop-shadow-lg group-hover:text-[#74ddc7] transition-colors">
                  {currentHeroSlide.data.label}
                </h3>
              </Link>
            ) : null}
            <div className="flex items-center gap-1.5">
              {ALL_HERO_SLIDES.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
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
        </div>

        {/* ── RIGHT CARD: Content panel with curved top-left ── */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-sidebar flex flex-col">
          {/* Subtle glow orb */}
          <div className="absolute -right-20 -top-20 h-[300px] w-[300px] rounded-full bg-[rgba(116,1,223,0.06)] blur-[100px]" />

          {/* Content */}
          <div className="relative z-20 flex flex-col justify-center flex-1 px-10 py-12 lg:px-14">
            <div className="space-y-6">
              <h1 className="text-3xl lg:text-4xl xl:text-5xl font-black leading-[1.1] text-foreground">
                Hip Hop, Sports, Reactions And Podcasts.
              </h1>

              <p className="text-base lg:text-lg text-muted-foreground max-w-md leading-relaxed">
                Experience premium digital content wherever you are!
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  size="lg"
                  onClick={handleListenLive}
                  className="group relative overflow-hidden rounded-full border-0 bg-[#dc2626] text-white font-bold shadow-lg shadow-red-500/20 hover:bg-[#b91c1c] hover:shadow-red-500/30 px-6"
                >
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  Now Streaming
                  <ArrowDownRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-full border-white/20 text-foreground hover:border-white/40 hover:bg-white/5 px-6"
                  asChild
                >
                  <Link href="/discover">
                    Discover More
                    <ArrowDownRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* ── News Ticker (bottom of right card) ── */}
          <div className="relative z-20 border-t border-border flex items-center h-9 overflow-hidden">
            {/* Label */}
            <div className="flex-shrink-0 flex items-center gap-2 px-4 border-r border-border h-full bg-foreground/[0.06]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-foreground/70 whitespace-nowrap">
                Platform Updates
              </span>
            </div>

            {/* Scrolling text */}
            <div className="flex-1 overflow-hidden">
              <div className="animate-marquee flex items-center gap-8 whitespace-nowrap">
                {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
                  <span
                    key={i}
                    className="text-xs text-muted-foreground flex items-center gap-8"
                  >
                    {item}
                    <span className="text-foreground/20">•</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
