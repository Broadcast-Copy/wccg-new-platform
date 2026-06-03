"use client";

import { useCallback, useEffect, useState } from "react";
import { Globe, MapPin, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import {
  GEO_BADGES,
  geoRewardsEnabled,
  setGeoRewardsEnabled,
  captureListeningLocation,
} from "@/lib/geo";
import { toast } from "sonner";

const TEAL = "#74ddc7";

/** A row from `listening_locations` (the signed-in user's own rows, via RLS). */
interface LocationRow {
  city: string | null;
  state: string | null;
  country: string | null;
  listen_count: number | null;
  last_listened_at: string | null;
}

/** A city within a grouped state, with its cumulative listen count. */
interface PlaceCity {
  city: string;
  listenCount: number;
}

/** Cities grouped under a single state, ordered by recency. */
interface PlaceGroup {
  state: string;
  cities: PlaceCity[];
}

/**
 * Group the user's locations by state → cities for display.
 *
 * Rows arrive ordered by `last_listened_at desc`, so the first time we see a
 * state (or a city within it) reflects the most-recent visit — we preserve
 * that order. A blank state is bucketed under "Unknown" so every place still
 * shows up truthfully.
 */
function groupPlaces(rows: LocationRow[]): PlaceGroup[] {
  const groups: PlaceGroup[] = [];
  const byState = new Map<string, PlaceGroup>();

  for (const row of rows) {
    const state = row.state?.trim() || "Unknown";
    const city = row.city?.trim() || "Unknown";
    let group = byState.get(state);
    if (!group) {
      group = { state, cities: [] };
      byState.set(state, group);
      groups.push(group);
    }
    if (!group.cities.some((c) => c.city === city)) {
      group.cities.push({ city, listenCount: row.listen_count ?? 0 });
    }
  }

  return groups;
}

/** Count distinct cities/states from the loaded rows (blank state ignored). */
function countExplored(rows: LocationRow[]): { cities: number; states: number } {
  const cities = new Set<string>();
  const states = new Set<string>();
  for (const row of rows) {
    const city = row.city?.trim();
    const state = row.state?.trim();
    if (city) cities.add(`${state ?? ""}|${city}`);
    if (state) states.add(state);
  }
  return { cities: cities.size, states: states.size };
}

export function ListeningPassport() {
  const { user, isLoading: authLoading } = useAuth();

  // Hydration-safe: the toggle's real (localStorage-backed) state is only read
  // after mount, so SSR and the first client render agree (both `false`).
  const [mounted, setMounted] = useState(false);
  const [enabled, setEnabled] = useState(false);

  const [rows, setRows] = useState<LocationRow[]>([]);
  const [badges, setBadges] = useState<Set<string>>(new Set());
  const [loadingData, setLoadingData] = useState(true);

  // Bumped after a successful capture to refetch places + badges.
  const [reloadKey, setReloadKey] = useState(0);

  // Set while we're requesting the browser location / recording it.
  const [capturing, setCapturing] = useState(false);
  // True once a capture returns null (denied/unavailable) — drives the inline
  // "location access required" note.
  const [needsPermission, setNeedsPermission] = useState(false);

  // Read the opt-in flag once on mount (client only) — a synchronous setState
  // in a mount effect with a `mounted` flag is fine and avoids a hydration
  // mismatch on the toggle.
  useEffect(() => {
    setEnabled(geoRewardsEnabled());
    setMounted(true);
  }, []);

  // Load the user's own places + unlocked badges. All setState happens after an
  // await behind an `active` guard, so there's no synchronous setState in the
  // effect body (satisfies react-hooks/set-state-in-effect).
  useEffect(() => {
    let active = true;

    async function load() {
      if (authLoading) return;
      if (!user) {
        if (!active) return;
        setRows([]);
        setBadges(new Set());
        setLoadingData(false);
        return;
      }

      const supabase = createClient();
      const [placesRes, badgesRes] = await Promise.all([
        supabase
          .from("listening_locations")
          .select("city, state, country, listen_count, last_listened_at")
          .eq("user_id", user.id)
          .order("last_listened_at", { ascending: false }),
        supabase
          .from("user_geo_badges")
          .select("badge_key")
          .eq("user_id", user.id),
      ]);
      if (!active) return;

      setRows((placesRes.data as LocationRow[] | null) ?? []);
      setBadges(
        new Set(
          ((badgesRes.data as { badge_key: string }[] | null) ?? []).map(
            (b) => b.badge_key,
          ),
        ),
      );
      setLoadingData(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [user, authLoading, reloadKey]);

  // Toggle handler: ON opts in + immediately captures the first location
  // (triggering the browser permission prompt); OFF just clears the flag.
  const onToggle = useCallback(
    async (next: boolean) => {
      setEnabled(next);
      setGeoRewardsEnabled(next);

      if (!next) {
        setNeedsPermission(false);
        return;
      }

      setNeedsPermission(false);
      setCapturing(true);
      let award: Awaited<ReturnType<typeof captureListeningLocation>> = null;
      try {
        award = await captureListeningLocation(createClient(), { force: true });
      } finally {
        setCapturing(false);
      }

      if (!award) {
        // Permission denied / unavailable / throttled with no fresh fix.
        setNeedsPermission(true);
        return;
      }

      // Toast each awarded city/state; otherwise a friendly "you're on the map".
      if (award.awarded.length > 0) {
        for (const a of award.awarded) {
          const icon = a.type === "city" ? "📍" : "🗺️";
          toast.success(`${icon} +${a.points} pts — new ${a.type}: ${a.label}!`);
        }
      } else {
        toast.success("📍 Location on — you're on the map!");
      }

      // Reveal any newly-unlocked places/badges.
      setReloadKey((k) => k + 1);
    },
    [],
  );

  const { cities, states } = countExplored(rows);
  const groups = groupPlaces(rows);
  const badgeEntries = Object.entries(GEO_BADGES);

  return (
    <Card className="rounded-2xl border border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Globe className="size-4" style={{ color: TEAL }} />
          Listening Passport
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Opt-in control */}
        <div
          className="flex items-start justify-between gap-4 rounded-xl border p-3"
          style={{ borderColor: `${TEAL}4D`, backgroundColor: `${TEAL}0D` }}
        >
          <div className="min-w-0">
            <label
              htmlFor="geo-rewards-toggle"
              className="flex items-center gap-1.5 text-sm font-medium"
            >
              <MapPin className="size-4" style={{ color: TEAL }} />
              Earn travel rewards
            </label>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Get points for every new city &amp; state you listen from.
            </p>
            {mounted && needsPermission ? (
              <p className="mt-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                Location access is required — allow it in your browser, then
                toggle this back on.
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2 pt-0.5">
            {capturing ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : null}
            <Switch
              id="geo-rewards-toggle"
              // Before mount we render the SSR-safe default (off) to avoid a
              // hydration mismatch; after mount it reflects localStorage.
              checked={mounted ? enabled : false}
              onCheckedChange={onToggle}
              disabled={!mounted || capturing}
              aria-label="Earn travel rewards"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="text-sm">
          <span className="font-semibold tabular-nums" style={{ color: TEAL }}>
            {cities}
          </span>{" "}
          {cities === 1 ? "city" : "cities"}
          <span className="mx-1.5 text-muted-foreground">·</span>
          <span className="font-semibold tabular-nums" style={{ color: TEAL }}>
            {states}
          </span>{" "}
          {states === 1 ? "state" : "states"} explored
        </div>

        {/* Places */}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Places
          </p>
          {loadingData ? (
            <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading places…
            </div>
          ) : groups.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              Turn on travel rewards and press play — you&apos;ll earn points for
              every new city &amp; state {"🗺️"}
            </p>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => (
                <div key={group.state}>
                  <p className="text-xs font-semibold">{group.state}</p>
                  <ul className="mt-1 space-y-0.5">
                    {group.cities.map((c) => (
                      <li
                        key={`${group.state}|${c.city}`}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="flex min-w-0 items-center gap-1.5">
                          <MapPin
                            className="size-3 shrink-0"
                            style={{ color: TEAL }}
                          />
                          <span className="truncate">{c.city}</span>
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                          {c.listenCount}{" "}
                          {c.listenCount === 1 ? "listen" : "listens"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Badges */}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Travel Badges
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {badgeEntries.map(([key, badge]) => {
              const unlocked = badges.has(key);
              return (
                <div
                  key={key}
                  className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                    unlocked ? "" : "opacity-50 grayscale"
                  }`}
                  style={
                    unlocked
                      ? {
                          borderColor: `${TEAL}4D`,
                          backgroundColor: `${TEAL}0D`,
                        }
                      : undefined
                  }
                >
                  <span
                    className="text-2xl"
                    role="img"
                    aria-label={badge.label}
                  >
                    {badge.emoji}
                  </span>
                  <div className="min-w-0">
                    <p
                      className={`truncate text-sm font-medium ${
                        unlocked ? "" : "text-muted-foreground"
                      }`}
                    >
                      {badge.label}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {badge.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
