"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Droplets, Wind, ChevronRight } from "lucide-react";

const LAT = 35.0527;
const LON = -78.8784;

function getEmoji(code: number): string {
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
  if (code >= 61 && code <= 63) return "Rain";
  if (code === 65) return "Heavy Rain";
  if (code >= 71 && code <= 75) return "Snow";
  if (code >= 80 && code <= 82) return "Showers";
  if (code >= 95) return "Thunderstorm";
  return "Cloudy";
}

function dayLabel(dateStr: string, idx: number): string {
  if (idx === 0) return "Today";
  if (idx === 1) return "Tmrw";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

interface Weather {
  temp: number;
  code: number;
  humidity: number;
  windSpeed: number;
  feelsLike: number;
}

interface Day {
  date: string;
  high: number;
  low: number;
  code: number;
  precip: number;
}

export function WeatherPill() {
  const [current, setCurrent] = useState<Weather | null>(null);
  const [forecast, setForecast] = useState<Day[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchWeather = useCallback(async () => {
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m,apparent_temperature&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&wind_speed_unit=mph&forecast_days=7&timezone=America%2FNew_York`
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
        setForecast(data.daily.time.map((d: string, i: number) => ({
          date: d,
          high: Math.round(data.daily.temperature_2m_max[i]),
          low: Math.round(data.daily.temperature_2m_min[i]),
          code: data.daily.weather_code[i],
          precip: data.daily.precipitation_probability_max?.[i] ?? 0,
        })));
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchWeather();
    const i = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(i);
  }, [fetchWeather]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!current) return null;

  return (
    <div ref={ref} className="relative hidden sm:block">
      {/* Pill button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 rounded-full bg-foreground/[0.04] hover:bg-foreground/[0.08] border border-border/50 px-2.5 py-1 transition-colors"
      >
        <span className="text-sm leading-none">{getEmoji(current.code)}</span>
        <span className="text-xs font-bold tabular-nums">{current.temp}°</span>
      </button>

      {/* Dropdown popover */}
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
          {/* Current weather header */}
          <div className="bg-gradient-to-br from-sky-500 to-blue-600 dark:from-sky-700 dark:to-blue-900 px-4 py-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-white/70">Fayetteville, NC</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-bold tabular-nums">{current.temp}°F</span>
                  <span className="text-lg">{getEmoji(current.code)}</span>
                </div>
                <p className="text-sm text-white/80 mt-0.5">{getCondition(current.code)}</p>
              </div>
              <div className="text-right text-[11px] text-white/60 space-y-1">
                <p>Feels {current.feelsLike}°</p>
                <p className="flex items-center gap-1 justify-end"><Droplets className="h-3 w-3" />{current.humidity}%</p>
                <p className="flex items-center gap-1 justify-end"><Wind className="h-3 w-3" />{current.windSpeed} mph</p>
              </div>
            </div>
          </div>

          {/* 7-day forecast */}
          <div className="px-3 py-3 space-y-1">
            {forecast.map((day, i) => (
              <div
                key={day.date}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${i === 0 ? "bg-primary/5" : ""}`}
              >
                <span className="text-xs font-medium text-muted-foreground w-10">{dayLabel(day.date, i)}</span>
                <span className="text-sm">{getEmoji(day.code)}</span>
                {day.precip > 0 && (
                  <span className="text-[10px] text-blue-500 font-medium w-8">{day.precip}%</span>
                )}
                {day.precip === 0 && <span className="w-8" />}
                <div className="flex-1 flex items-center gap-1 justify-end">
                  <span className="text-xs font-bold tabular-nums">{day.high}°</span>
                  <div className="w-16 h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-400 to-orange-400"
                      style={{ width: `${Math.min(100, Math.max(20, ((day.high - day.low) / 40) * 100))}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">{day.low}°</span>
                </div>
              </div>
            ))}
          </div>

          {/* Footer link */}
          <Link
            href="/weather"
            onClick={() => setOpen(false)}
            className="flex items-center justify-between px-4 py-2.5 border-t border-border text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
          >
            Full Forecast & Radar
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
