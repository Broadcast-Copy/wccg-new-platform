"use client";

import { WeatherWidget } from "@/components/weather/weather-widget";
import { CloudSun, MapPin, Radio } from "lucide-react";

export default function WeatherPage() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-sky-950/50 to-gray-900 border border-border/30">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, rgba(59,130,246,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 30%, rgba(245,158,11,0.2) 0%, transparent 50%)`,
            }}
          />
        </div>
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f59e0b] to-[#d97706] shadow-xl shadow-amber-500/20">
              <CloudSun className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-2">
                Realtime Weather Forecast
              </h1>
              <p className="text-base text-muted-foreground max-w-2xl">
                Stay ahead with real-time weather forecasts for Fayetteville, NC and the surrounding area. Plan your day or event with confidence.
              </p>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#3b82f6]" />
                <span className="text-sm font-medium text-gray-300">Location</span>
              </div>
              <p className="mt-1 text-lg font-bold text-foreground">Fayetteville, NC</p>
            </div>
            <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-[#74ddc7]" />
                <span className="text-sm font-medium text-gray-300">Station</span>
              </div>
              <p className="mt-1 text-lg font-bold text-foreground">WCCG 104.5 FM</p>
            </div>
          </div>
        </div>
      </div>

      {/* Weather Widget */}
      <div className="max-w-xl mx-auto">
        <WeatherWidget />
      </div>

      {/* Info */}
      <div className="rounded-xl border border-border bg-card p-6 text-center max-w-xl mx-auto">
        <p className="text-sm text-muted-foreground">
          Weather data powered by Open-Meteo. Updated every 30 minutes.
          <br />
          Serving Cumberland, Harnett, Robeson, Hoke, Bladen, Sampson, Lee, Moore &amp; Scotland counties.
        </p>
      </div>
    </div>
  );
}
