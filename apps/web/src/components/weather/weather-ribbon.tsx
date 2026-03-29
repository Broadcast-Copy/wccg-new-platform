"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Droplets, Wind, MapPin } from "lucide-react";

// ─── Weather helpers ──────────────────────────────────────────────────

const LAT = 35.0527;
const LON = -78.8784;

function getWeatherEmoji(code: number): string {
  if (code === 0 || code === 1) return "☀️";
  if (code === 2) return "⛅";
  if (code === 3) return "☁️";
  if (code >= 45 && code <= 48) return "🌫️";
  if (code >= 51 && code <= 57) return "🌦️";
  if (code >= 61 && code <= 65) return "🌧️";
  if (code >= 66 && code <= 67) return "🌨️";
  if (code >= 71 && code <= 77) return "❄️";
  if (code >= 80 && code <= 82) return "🌧️";
  if (code >= 85 && code <= 86) return "❄️";
  if (code >= 95) return "⛈️";
  return "☁️";
}

function getCondition(code: number): string {
  if (code === 0) return "Clear";
  if (code === 1) return "Mostly Clear";
  if (code === 2) return "Partly Cloudy";
  if (code === 3) return "Overcast";
  if (code >= 45 && code <= 48) return "Foggy";
  if (code >= 51 && code <= 55) return "Drizzle";
  if (code >= 56 && code <= 57) return "Freezing Drizzle";
  if (code >= 61 && code <= 63) return "Rain";
  if (code === 65) return "Heavy Rain";
  if (code >= 66 && code <= 67) return "Freezing Rain";
  if (code >= 71 && code <= 75) return "Snow";
  if (code === 77) return "Snow Grains";
  if (code >= 80 && code <= 82) return "Showers";
  if (code >= 85 && code <= 86) return "Snow Showers";
  if (code >= 95) return "Thunderstorm";
  return "Cloudy";
}

function dayLabel(dateStr: string, idx: number): string {
  if (idx === 0) return "Today";
  if (idx === 1) return "Tomorrow";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

// ─── Types ────────────────────────────────────────────────────────────

interface CurrentWeather {
  temp: number;
  code: number;
  humidity: number;
  windSpeed: number;
  feelsLike: number;
}

interface DayForecast {
  date: string;
  high: number;
  low: number;
  code: number;
  precipProb: number;
}

// ─── Component ────────────────────────────────────────────────────────

export function WeatherRibbon() {
  const [current, setCurrent] = useState<CurrentWeather | null>(null);
  const [forecast, setForecast] = useState<DayForecast[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchWeather = useCallback(async () => {
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m,apparent_temperature&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&wind_speed_unit=mph&forecast_days=16&timezone=America%2FNew_York`
      );
      const data = await res.json();

      if (data.current) {
        setCurrent({
          temp: Math.round(data.current.temperature_2m),
          code: data.current.weather_code,
          humidity: data.current.relative_humidity_2m,
          windSpeed: Math.round(data.current.wind_speed_10m),
          feelsLike: Math.round(data.current.apparent_temperature),
        });
      }

      if (data.daily) {
        const days: DayForecast[] = data.daily.time.map((date: string, i: number) => ({
          date,
          high: Math.round(data.daily.temperature_2m_max[i]),
          low: Math.round(data.daily.temperature_2m_min[i]),
          code: data.daily.weather_code[i],
          precipProb: data.daily.precipitation_probability_max?.[i] ?? 0,
        }));
        setForecast(days);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWeather();
    const interval = setInterval(fetchWeather, 30 * 60 * 1000); // 30 min
    return () => clearInterval(interval);
  }, [fetchWeather]);

  if (loading || !current) return null;

  const threeDayForecast = forecast.slice(0, 3);
  const extendedForecast = forecast.slice(0, 15);

  return (
    <div className="border-b border-border bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-950/20 dark:to-blue-950/20">
      {/* Compact ribbon — always visible */}
      <div className="container flex items-center justify-between py-1.5 gap-2">
        {/* Current weather */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-base leading-none">{getWeatherEmoji(current.code)}</span>
          <span className="text-sm font-bold tabular-nums">{current.temp}°F</span>
          <span className="hidden sm:inline text-xs text-muted-foreground">{getCondition(current.code)}</span>
          <span className="hidden md:inline text-xs text-muted-foreground/60">•</span>
          <span className="hidden md:flex items-center gap-0.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> Fayetteville
          </span>
        </div>

        {/* 3-day mini forecast */}
        <div className="hidden sm:flex items-center gap-3">
          {threeDayForecast.map((day, i) => (
            <div key={day.date} className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/70">{dayLabel(day.date, i)}</span>
              <span className="text-[10px] leading-none">{getWeatherEmoji(day.code)}</span>
              <span className="tabular-nums">{day.high}°</span>
              <span className="text-muted-foreground/50 tabular-nums">{day.low}°</span>
            </div>
          ))}
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          {expanded ? "Less" : "15-Day"}
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="container pb-3 space-y-3">
          {/* Current details */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground border-t border-border/50 pt-2">
            <span>Feels like <strong className="text-foreground">{current.feelsLike}°F</strong></span>
            <span className="flex items-center gap-1"><Droplets className="h-3 w-3" /> {current.humidity}%</span>
            <span className="flex items-center gap-1"><Wind className="h-3 w-3" /> {current.windSpeed} mph</span>
            <Link href="/weather" className="ml-auto text-primary hover:underline font-medium">
              Full Forecast →
            </Link>
          </div>

          {/* 15-day forecast grid */}
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-15 gap-1.5">
            {extendedForecast.map((day, i) => (
              <div
                key={day.date}
                className={`flex flex-col items-center gap-0.5 rounded-lg px-1.5 py-2 text-center ${
                  i === 0 ? "bg-primary/10 border border-primary/20" : "bg-card border border-border/50"
                }`}
              >
                <span className="text-[9px] font-semibold text-muted-foreground">{dayLabel(day.date, i)}</span>
                <span className="text-sm leading-none">{getWeatherEmoji(day.code)}</span>
                <span className="text-[10px] font-bold tabular-nums">{day.high}°</span>
                <span className="text-[9px] text-muted-foreground/60 tabular-nums">{day.low}°</span>
                {day.precipProb > 0 && (
                  <span className="text-[8px] text-blue-500 font-medium">{day.precipProb}%</span>
                )}
              </div>
            ))}
          </div>

          {/* Radar embed */}
          <div className="rounded-xl overflow-hidden border border-border">
            <div className="bg-card px-3 py-1.5 border-b border-border flex items-center justify-between">
              <span className="text-xs font-semibold">Doppler Radar — Fayetteville, NC</span>
              <Link href="/weather" className="text-[10px] text-primary hover:underline">Open Full Map</Link>
            </div>
            <iframe
              src="https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=in&metricTemp=°F&metricWind=mph&zoom=8&overlay=radar&product=radar&level=surface&lat=35.05&lon=-78.88&width=650&height=300"
              width="100%"
              height="300"
              frameBorder="0"
              className="w-full"
              title="Doppler Radar"
              loading="lazy"
            />
          </div>
        </div>
      )}
    </div>
  );
}
