"use client";

import { useEffect, useState } from "react";

// ─── Weather code to emoji mapping ────────────────────────────────────

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

function getConditionLabel(code: number): string {
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
  return "Unknown";
}

// ─── Drive time check ─────────────────────────────────────────────────

/** Returns true during drive times: 6-9 AM and 4-7 PM Eastern */
function isDriveTime(): boolean {
  const now = new Date();
  const etString = now.toLocaleString("en-US", { timeZone: "America/New_York" });
  const etDate = new Date(etString);
  const hour = etDate.getHours();
  return (hour >= 6 && hour < 9) || (hour >= 16 && hour < 19);
}

// ─── Component ────────────────────────────────────────────────────────

interface WeatherInfo {
  temperature: number;
  weatherCode: number;
}

/**
 * WeatherStrip — thin strip showing drive-time weather for Fayetteville NC.
 *
 * Only visible during drive times (6-9 AM and 4-7 PM ET).
 * Fetches from Open-Meteo free API — no API key required.
 */
export function WeatherStrip() {
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check drive time immediately and every 60s
    const checkVisibility = () => setVisible(isDriveTime());
    checkVisibility();
    const visibilityTimer = setInterval(checkVisibility, 60_000);

    // Fetch weather
    const fetchWeather = async () => {
      try {
        const res = await fetch(
          "https://api.open-meteo.com/v1/forecast?latitude=35.0527&longitude=-78.8784&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=America%2FNew_York"
        );
        if (!res.ok) return;
        const data = await res.json();
        setWeather({
          temperature: Math.round(data.current.temperature_2m),
          weatherCode: data.current.weather_code,
        });
      } catch {
        // Silently fail — strip just won't show weather
      }
    };

    fetchWeather();
    const weatherTimer = setInterval(fetchWeather, 15 * 60 * 1000); // Refresh every 15 min

    return () => {
      clearInterval(visibilityTimer);
      clearInterval(weatherTimer);
    };
  }, []);

  if (!visible || !weather) return null;

  const emoji = getWeatherEmoji(weather.weatherCode);
  const condition = getConditionLabel(weather.weatherCode);

  return (
    <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#7401df]/20 to-[#74ddc7]/20 px-3 py-0.5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-[#74ddc7]">
        Drive Time Weather
      </span>
      <span className="text-[10px] text-muted-foreground">|</span>
      <span className="text-[10px] font-medium text-foreground">
        {emoji} {weather.temperature}°F {condition}
      </span>
      <span className="text-[10px] text-muted-foreground">
        Fayetteville, NC
      </span>
    </div>
  );
}
