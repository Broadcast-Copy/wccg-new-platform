"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Info, Star } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useGeolocation, getDistanceMeters } from "@/hooks/use-geolocation";
import { CHECK_IN_LOCATIONS, type CheckInLocation } from "@/data/check-in-locations";
import { hasCheckedIn, recordCheckIn } from "@/lib/check-in";
import { CheckInCard } from "@/components/check-in/check-in-card";
import { CheckInSuccess } from "@/components/check-in/check-in-success";
import Link from "next/link";

export default function CheckInPage() {
  const { user } = useAuth();
  const { latitude, longitude, error, loading, refresh } = useGeolocation();
  const [checkedInIds, setCheckedInIds] = useState<Set<string>>(new Set());
  const [successInfo, setSuccessInfo] = useState<{
    name: string;
    points: number;
  } | null>(null);
  const [locationRequested, setLocationRequested] = useState(false);

  // Load check-in state from localStorage
  useEffect(() => {
    if (!user?.email) return;
    const ids = new Set<string>();
    for (const loc of CHECK_IN_LOCATIONS) {
      if (hasCheckedIn(user.email, loc.id)) {
        ids.add(loc.id);
      }
    }
    setCheckedInIds(ids);
  }, [user?.email]);

  // Sort active locations by distance
  const sortedLocations = useMemo(() => {
    const active = CHECK_IN_LOCATIONS.filter((l) => l.isActive);
    if (latitude === null || longitude === null) return active;
    return [...active].sort((a, b) => {
      const distA = getDistanceMeters(latitude, longitude, a.lat, a.lng);
      const distB = getDistanceMeters(latitude, longitude, b.lat, b.lng);
      return distA - distB;
    });
  }, [latitude, longitude]);

  const getDistance = useCallback(
    (loc: CheckInLocation): number | null => {
      if (latitude === null || longitude === null) return null;
      return getDistanceMeters(latitude, longitude, loc.lat, loc.lng);
    },
    [latitude, longitude],
  );

  const handleCheckIn = useCallback(
    (location: CheckInLocation) => {
      if (!user?.email) return;
      recordCheckIn(user.email, location.id, location.points);
      setCheckedInIds((prev) => new Set(prev).add(location.id));
      setSuccessInfo({ name: location.name, points: location.points });
    },
    [user?.email],
  );

  const handleDemoCheckIn = useCallback(
    (location: CheckInLocation) => {
      if (!user?.email) return;
      recordCheckIn(user.email, location.id, location.points);
      setCheckedInIds((prev) => new Set(prev).add(location.id));
      setSuccessInfo({ name: location.name, points: location.points });
    },
    [user?.email],
  );

  const handleRequestLocation = useCallback(() => {
    setLocationRequested(true);
    refresh();
  }, [refresh]);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-teal-950/50 to-gray-900 border border-border/30">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 30% 50%, rgba(116,221,199,0.3) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(116,1,223,0.2) 0%, transparent 50%)",
            }}
          />
        </div>
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#74ddc7] to-teal-600 shadow-xl shadow-teal-500/20">
              <MapPin className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">
                Street Team Check-In
              </h1>
              <p className="text-base text-white/60 max-w-2xl">
                Visit WCCG events around Fayetteville and check in to earn bonus
                points! The more events you attend, the more you earn.
              </p>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-teal-400" />
                <span className="text-sm font-medium text-white/60">Events</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-white">
                {CHECK_IN_LOCATIONS.filter((l) => l.isActive).length}
              </p>
            </div>
            <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-medium text-white/60">Max Points</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-white">
                {CHECK_IN_LOCATIONS.filter((l) => l.isActive)
                  .reduce((sum, l) => sum + l.points, 0)
                  .toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-medium text-white/60">Checked In</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-white">{checkedInIds.size}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Not logged in */}
      {!user && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <MapPin className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Please{" "}
              <Link href="/login" className="underline hover:text-foreground">
                sign in
              </Link>{" "}
              to check in at events and earn points.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Location permission card */}
      {user && latitude === null && !loading && (
        <Card className="border-[#74ddc7]/30 bg-gradient-to-r from-[#74ddc7]/5 to-transparent">
          <CardContent className="flex flex-col sm:flex-row items-center gap-4 p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#74ddc7]/10">
              <Navigation className="h-6 w-6 text-[#74ddc7]" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <p className="text-sm font-semibold">Enable Location</p>
              <p className="text-xs text-muted-foreground">
                {error && locationRequested
                  ? error
                  : "Allow location access to see your distance from events and check in when nearby."}
              </p>
            </div>
            <Button
              onClick={handleRequestLocation}
              className="shrink-0 bg-[#74ddc7] hover:bg-[#74ddc7]/90 text-black"
            >
              <Navigation className="h-4 w-4 mr-1.5" />
              {locationRequested ? "Retry" : "Enable Location"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span className="text-sm">Getting your location...</span>
        </div>
      )}

      {/* Events list */}
      {user && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Active Events</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sortedLocations.map((location) => (
              <CheckInCard
                key={location.id}
                location={location}
                distanceMeters={getDistance(location)}
                alreadyCheckedIn={checkedInIds.has(location.id)}
                onCheckIn={handleCheckIn}
                onDemoCheckIn={handleDemoCheckIn}
              />
            ))}
          </div>
        </section>
      )}

      {/* Info section */}
      <Card className="bg-muted/30">
        <CardContent className="flex items-start gap-3 p-5">
          <Info className="h-5 w-5 text-[#74ddc7] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold mb-1">How It Works</p>
            <ul className="text-[12px] text-muted-foreground space-y-1 list-disc list-inside">
              <li>Visit WCCG events and check in to earn bonus points!</li>
              <li>You must be within 200 meters of an event to check in.</li>
              <li>Each event can only be checked into once.</li>
              <li>Use the "Demo Check In" button to try it out from anywhere.</li>
              <li>Points are added to your WCCG balance instantly.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Success overlay */}
      {successInfo && (
        <CheckInSuccess
          eventName={successInfo.name}
          pointsAwarded={successInfo.points}
          onDismiss={() => setSuccessInfo(null)}
        />
      )}
    </div>
  );
}
