"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  Disc3,
  LineChart,
  type LucideIcon,
  PlayCircle,
  Radio,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { FEATURES, ON_DEMAND_FEATURE } from "@/content";

/**
 * Real-time feature grid. Renders the bundled list from content.ts as its
 * initial state — so the full grid is in the static HTML (no flash, no SEO
 * loss) — then swaps to bc_features (mig 097, public read) if the DB returns
 * rows, so marketing copy is editable without a rebuild. The DB stores a
 * lucide icon NAME; ICON_MAP resolves it back to a component here.
 */

const ICON_MAP: Record<string, LucideIcon> = {
  Radio,
  CalendarClock,
  Disc3,
  Trophy,
  AlertTriangle,
  ShieldCheck,
  LineChart,
  Users,
  Sparkles,
  PlayCircle,
};

type FeatureVM = { name: string; blurb: string; Icon: LucideIcon };

const FALLBACK: FeatureVM[] = [...FEATURES, ON_DEMAND_FEATURE].map((f) => ({
  name: f.name,
  blurb: f.blurb,
  Icon: f.icon,
}));

type FeatureRow = { name: string; blurb: string; icon: string };

export function Features() {
  const [features, setFeatures] = useState<FeatureVM[]>(FALLBACK);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from("bc_features")
        .select("name, blurb, icon")
        .order("sort_order", { ascending: true });
      if (cancelled || error || !data || data.length === 0) return;
      setFeatures(
        (data as FeatureRow[]).map((r) => ({
          name: r.name,
          blurb: r.blurb,
          Icon: ICON_MAP[r.icon] ?? Sparkles,
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mt-12 flex flex-wrap justify-center gap-5">
      {features.map((feature) => (
        <article
          key={feature.name}
          className="w-full rounded-2xl border border-line bg-surface p-6 transition hover:border-signal/30 sm:w-[calc(50%-0.625rem)] lg:w-[calc(33.333%-0.834rem)]"
        >
          <feature.Icon className="h-6 w-6 text-signal" aria-hidden />
          <h3 className="mt-4 font-semibold">{feature.name}</h3>
          <p className="mt-2 text-sm leading-relaxed text-dim">{feature.blurb}</p>
        </article>
      ))}
    </div>
  );
}
