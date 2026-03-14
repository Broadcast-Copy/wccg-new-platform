"use client";

import { useState, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tag, Navigation, Info, MapPin, Store } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useGeolocation, getDistanceMeters } from "@/hooks/use-geolocation";
import { DEALS, type Deal } from "@/data/deals";
import { DealCard } from "@/components/deals/deal-card";
import { DealRedemption } from "@/components/deals/deal-redemption";
import Link from "next/link";

const CATEGORIES = ["All", "Food", "Services", "Auto", "Beauty", "Entertainment"] as const;

export default function DealsPage() {
  const { user } = useAuth();
  const { latitude, longitude, error, loading, refresh } = useGeolocation();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [locationRequested, setLocationRequested] = useState(false);

  // Filter by category
  const filteredDeals = useMemo(() => {
    const deals =
      selectedCategory === "All"
        ? DEALS
        : DEALS.filter((d) => d.category === selectedCategory);

    // Sort by distance if we have location
    if (latitude !== null && longitude !== null) {
      return [...deals].sort((a, b) => {
        const distA = getDistanceMeters(latitude, longitude, a.lat, a.lng);
        const distB = getDistanceMeters(latitude, longitude, b.lat, b.lng);
        return distA - distB;
      });
    }

    return deals;
  }, [selectedCategory, latitude, longitude]);

  const getDistance = useCallback(
    (deal: Deal): number | null => {
      if (latitude === null || longitude === null) return null;
      return getDistanceMeters(latitude, longitude, deal.lat, deal.lng);
    },
    [latitude, longitude],
  );

  const handleRequestLocation = useCallback(() => {
    setLocationRequested(true);
    refresh();
  }, [refresh]);

  const nearbyCount = useMemo(() => {
    if (latitude === null || longitude === null) return 0;
    return DEALS.filter(
      (d) =>
        getDistanceMeters(latitude, longitude, d.lat, d.lng) <=
        d.nearbyThresholdMeters,
    ).length;
  }, [latitude, longitude]);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-purple-950/50 to-gray-900 border border-border/30">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 30% 50%, rgba(116,1,223,0.3) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(116,221,199,0.2) 0%, transparent 50%)",
            }}
          />
        </div>
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7401df] to-purple-800 shadow-xl shadow-purple-500/20">
              <Tag className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">
                Local Deals
              </h1>
              <p className="text-base text-white/60 max-w-2xl">
                Exclusive offers from businesses near you, powered by WCCG 104.5 FM.
                Show these offers at participating businesses near you!
              </p>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-medium text-white/60">Offers</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-white">{DEALS.length}</p>
            </div>
            <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-teal-400" />
                <span className="text-sm font-medium text-white/60">Nearby</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-white">
                {latitude !== null ? nearbyCount : "--"}
              </p>
            </div>
            <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-medium text-white/60">Categories</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-white">
                {new Set(DEALS.map((d) => d.category)).size}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Location permission card */}
      {latitude === null && !loading && (
        <Card className="border-[#7401df]/30 bg-gradient-to-r from-[#7401df]/5 to-transparent">
          <CardContent className="flex flex-col sm:flex-row items-center gap-4 p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#7401df]/10">
              <Navigation className="h-6 w-6 text-[#7401df]" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <p className="text-sm font-semibold">Enable Location</p>
              <p className="text-xs text-muted-foreground">
                {error && locationRequested
                  ? error
                  : "Allow location access to see deals near you and get distance information."}
              </p>
            </div>
            <Button
              onClick={handleRequestLocation}
              className="shrink-0 bg-[#7401df] hover:bg-[#7401df]/90 text-white"
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

      {/* Category filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              selectedCategory === cat
                ? "bg-[#7401df] text-white shadow-sm"
                : "bg-foreground/[0.06] text-muted-foreground hover:text-foreground hover:bg-foreground/[0.1]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Deals grid */}
      <section className="space-y-4">
        {filteredDeals.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
              <Tag className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No deals found in this category.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDeals.map((deal) => (
              <DealCard
                key={deal.id}
                deal={deal}
                distanceMeters={getDistance(deal)}
                onShowOffer={setActiveDeal}
              />
            ))}
          </div>
        )}
      </section>

      {/* Info section */}
      <Card className="bg-muted/30">
        <CardContent className="flex items-start gap-3 p-5">
          <Info className="h-5 w-5 text-[#7401df] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold mb-1">About Local Deals</p>
            <ul className="text-[12px] text-muted-foreground space-y-1 list-disc list-inside">
              <li>Show these offers at participating businesses near you!</li>
              <li>Deals marked "Nearby!" are within walking distance.</li>
              <li>Tap "Show Offer" to display the coupon to the cashier.</li>
              <li>All offers are courtesy of WCCG 104.5 FM and our local partners.</li>
              <li>Offers subject to change. Check back for new deals regularly.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Deal redemption modal */}
      {activeDeal && (
        <DealRedemption deal={activeDeal} onClose={() => setActiveDeal(null)} />
      )}
    </div>
  );
}
