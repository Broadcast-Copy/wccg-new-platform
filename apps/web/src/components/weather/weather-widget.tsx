"use client";

import { useEffect, useState } from "react";
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudDrizzle,
  CloudFog,
  Wind,
  Droplets,
  Thermometer,
  Eye,
  ArrowUp,
  ArrowDown,
  Loader2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────

interface WeatherData {
  temperature: number;
  feelsLike: number;
  high: number;
  low: number;
  condition: string;
  conditionCode: number;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  visibility: number;
  uvIndex: number;
  forecast: ForecastDay[];
  location: string;
  lastUpdated: string;
}

interface ForecastDay {
  day: string;
  high: number;
  low: number;
  conditionCode: number;
  condition: string;
  precipitation: number;
}

// ─── Weather code to icon/label mapping ───────────────────────────────
// WMO Weather interpretation codes (open-meteo)

function getWeatherIcon(code: number, size = "h-6 w-6") {
  if (code === 0 || code === 1)
    return <Sun className={`${size} text-[#f59e0b]`} />;
  if (code === 2)
    return <Cloud className={`${size} text-foreground/60`} />;
  if (code === 3)
    return <Cloud className={`${size} text-muted-foreground`} />;
  if (code >= 45 && code <= 48)
    return <CloudFog className={`${size} text-muted-foreground`} />;
  if (code >= 51 && code <= 55)
    return <CloudDrizzle className={`${size} text-[#06b6d4]`} />;
  if (code >= 56 && code <= 57)
    return <CloudDrizzle className={`${size} text-[#94a3b8]`} />;
  if (code >= 61 && code <= 65)
    return <CloudRain className={`${size} text-[#3b82f6]`} />;
  if (code >= 66 && code <= 67)
    return <CloudRain className={`${size} text-[#94a3b8]`} />;
  if (code >= 71 && code <= 77)
    return <CloudSnow className={`${size} text-foreground`} />;
  if (code >= 80 && code <= 82)
    return <CloudRain className={`${size} text-[#3b82f6]`} />;
  if (code >= 85 && code <= 86)
    return <CloudSnow className={`${size} text-foreground`} />;
  if (code >= 95 && code <= 99)
    return <CloudLightning className={`${size} text-[#f59e0b]`} />;
  return <Cloud className={`${size} text-muted-foreground`} />;
}

function getConditionLabel(code: number): string {
  if (code === 0) return "Clear Sky";
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
  if (code >= 80 && code <= 82) return "Rain Showers";
  if (code >= 85 && code <= 86) return "Snow Showers";
  if (code >= 95) return "Thunderstorm";
  return "Unknown";
}

function getDayName(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

// ─── Fayetteville, NC coordinates ─────────────────────────────────────

const LAT = 35.0527;
const LNG = -78.8784;

// ─── Component ────────────────────────────────────────────────────────

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true);
        // Open-Meteo free API — no API key required
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LNG}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FNew_York&forecast_days=7`
        );

        if (!res.ok) throw new Error("Failed to fetch weather");
        const data = await res.json();

        const windDeg = data.current.wind_direction_10m;
        const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
        const windDir = directions[Math.round(windDeg / 45) % 8];

        const forecast: ForecastDay[] = data.daily.time.slice(0, 7).map((date: string, i: number) => ({
          day: getDayName(date),
          high: Math.round(data.daily.temperature_2m_max[i]),
          low: Math.round(data.daily.temperature_2m_min[i]),
          conditionCode: data.daily.weather_code[i],
          condition: getConditionLabel(data.daily.weather_code[i]),
          precipitation: data.daily.precipitation_probability_max[i],
        }));

        setWeather({
          temperature: Math.round(data.current.temperature_2m),
          feelsLike: Math.round(data.current.apparent_temperature),
          high: forecast[0]?.high ?? 0,
          low: forecast[0]?.low ?? 0,
          condition: getConditionLabel(data.current.weather_code),
          conditionCode: data.current.weather_code,
          humidity: data.current.relative_humidity_2m,
          windSpeed: Math.round(data.current.wind_speed_10m),
          windDirection: windDir,
          visibility: 10,
          uvIndex: 0,
          forecast,
          location: "Fayetteville, NC",
          lastUpdated: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
        });
        setError(false);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 30 * 60 * 1000); // refresh every 30 min
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-center gap-2 text-muted-foreground/70 py-8">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading weather...</span>
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="text-center py-8">
          <Cloud className="h-8 w-8 text-foreground/20 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground/70">Weather unavailable</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Current conditions */}
      <div className="bg-gradient-to-br from-[#0d1b2a] to-[#141420] p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-white/70 uppercase tracking-wider font-medium mb-1">
              {weather.location}
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-white">{weather.temperature}°</span>
              <span className="text-lg text-white/70">F</span>
            </div>
            <p className="text-sm text-white/70 mt-1">{weather.condition}</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              Feels like {weather.feelsLike}°
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {getWeatherIcon(weather.conditionCode, "h-12 w-12")}
            <div className="flex items-center gap-2 text-xs text-muted-foreground/70 mt-1">
              <span className="flex items-center gap-0.5">
                <ArrowUp className="h-3 w-3 text-[#ef4444]" />
                {weather.high}°
              </span>
              <span className="flex items-center gap-0.5">
                <ArrowDown className="h-3 w-3 text-[#3b82f6]" />
                {weather.low}°
              </span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
          <div className="text-center">
            <Droplets className="h-4 w-4 text-[#3b82f6] mx-auto mb-1" />
            <p className="text-xs text-white/70 font-medium">{weather.humidity}%</p>
            <p className="text-[10px] text-muted-foreground/60">Humidity</p>
          </div>
          <div className="text-center">
            <Wind className="h-4 w-4 text-[#06b6d4] mx-auto mb-1" />
            <p className="text-xs text-white/70 font-medium">{weather.windSpeed} mph</p>
            <p className="text-[10px] text-muted-foreground/60">{weather.windDirection} Wind</p>
          </div>
          <div className="text-center">
            <Thermometer className="h-4 w-4 text-[#f59e0b] mx-auto mb-1" />
            <p className="text-xs text-white/70 font-medium">{weather.feelsLike}°</p>
            <p className="text-[10px] text-muted-foreground/60">Feels Like</p>
          </div>
        </div>
      </div>

      {/* 7-day forecast */}
      <div className="px-5 py-3 border-t border-border">
        <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/20 mb-2">7-Day Forecast</p>
        <div className="space-y-1.5">
          {weather.forecast.map((day, i) => (
            <div
              key={day.day}
              className={`flex items-center gap-3 py-1.5 ${i === 0 ? "text-foreground" : "text-foreground/60"}`}
            >
              <span className={`w-16 text-xs font-medium ${i === 0 ? "text-[#74ddc7]" : ""}`}>
                {day.day}
              </span>
              {getWeatherIcon(day.conditionCode, "h-4 w-4")}
              <span className="flex-1 text-xs text-muted-foreground/70 truncate">{day.condition}</span>
              {day.precipitation > 0 && (
                <span className="text-[10px] text-[#3b82f6]">{day.precipitation}%</span>
              )}
              <span className="w-16 text-right text-xs">
                <span className={i === 0 ? "text-foreground" : "text-foreground/60"}>{day.high}°</span>
                <span className="text-muted-foreground/60 mx-1">/</span>
                <span className="text-muted-foreground/70">{day.low}°</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-2 border-t border-border bg-sidebar">
        <p className="text-[10px] text-foreground/15 text-center">
          Updated {weather.lastUpdated} · Open-Meteo
        </p>
      </div>
    </div>
  );
}
