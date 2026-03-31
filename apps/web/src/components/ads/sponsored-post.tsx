"use client";

import { useEffect, useRef, useCallback } from "react";
import { BadgeCheck, ExternalLink } from "lucide-react";
import Image from "next/image";

// ──────────────────────────── Types ────────────────────────────

export type SponsoredContentType = "hub_post" | "product" | "listing";

export interface SponsoredPostProps {
  /** Determines card layout and styling */
  type: SponsoredContentType;
  /** Main text body of the sponsored content */
  content: string;
  /** Business name shown alongside the verified badge */
  advertiserName: string;
  /** CTA button label — e.g. "Visit Website", "Shop Now", "Learn More" */
  ctaText: string;
  /** CTA destination URL */
  ctaUrl: string;
  /** Optional accent color override (defaults to amber-500) */
  accentColor?: string;
  /** Optional image URL for the content area */
  imageUrl?: string;
  /** Optional headline (used for product and listing types) */
  headline?: string;
  /** Optional price string (used for product type) */
  price?: string;
  /** Unique campaign/ad ID for impression tracking */
  adId?: string;
}

// ──────────────────────────── Impression Tracker ────────────────────────────

function useImpressionTracker(adId?: string) {
  const tracked = useRef(false);
  const ref = useRef<HTMLDivElement>(null);

  const trackImpression = useCallback(() => {
    if (tracked.current || !adId) return;
    tracked.current = true;
    // TODO: Replace with fetch to dsp_analytics endpoint
    console.log(`[DSP] Impression logged — ad: ${adId}, ts: ${Date.now()}`);
  }, [adId]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !adId) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          trackImpression();
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [adId, trackImpression]);

  return ref;
}

// ──────────────────────────── Component ────────────────────────────

export function SponsoredPost({
  type,
  content,
  advertiserName,
  ctaText,
  ctaUrl,
  accentColor = "#f59e0b",
  imageUrl,
  headline,
  price,
  adId,
}: SponsoredPostProps) {
  const containerRef = useImpressionTracker(adId);

  const handleCtaClick = () => {
    if (adId) {
      // TODO: Replace with fetch to dsp_analytics endpoint
      console.log(`[DSP] CTA click — ad: ${adId}, ts: ${Date.now()}`);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative rounded-xl border border-border bg-card overflow-hidden transition-all hover:border-input"
      style={{ borderTopColor: accentColor, borderTopWidth: 2 }}
    >
      {/* Sponsored badge */}
      <div className="absolute top-2 right-2 z-10">
        <span
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
          style={{
            backgroundColor: `${accentColor}18`,
            color: accentColor,
          }}
        >
          Sponsored
        </span>
      </div>

      {/* Image area (if provided) */}
      {imageUrl && (
        <div className="relative w-full aspect-video bg-foreground/[0.04]">
          <Image
            src={imageUrl}
            alt={headline || advertiserName}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      )}

      {/* Content body */}
      <div className="p-4 space-y-3">
        {/* Advertiser name with verified badge */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-foreground truncate">
            {advertiserName}
          </span>
          <BadgeCheck
            className="h-4 w-4 flex-shrink-0"
            style={{ color: accentColor }}
          />
        </div>

        {/* Headline (product / listing) */}
        {headline && (
          <h3 className="text-base font-bold text-foreground leading-snug">
            {headline}
          </h3>
        )}

        {/* Price (product type) */}
        {type === "product" && price && (
          <p
            className="text-lg font-bold"
            style={{ color: accentColor }}
          >
            {price}
          </p>
        )}

        {/* Body text */}
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
          {content}
        </p>

        {/* CTA */}
        <a
          href={ctaUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={handleCtaClick}
          className="inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: accentColor }}
        >
          {ctaText}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
