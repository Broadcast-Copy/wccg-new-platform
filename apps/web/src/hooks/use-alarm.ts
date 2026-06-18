"use client";

import { useEffect, useCallback, useState } from "react";
import { toast } from "sonner";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import {
  loadAlarm,
  saveAlarm,
  clearAlarm as clearAlarmConfig,
  isAlarmDue,
  markAlarmTriggered,
  type AlarmConfig,
} from "@/lib/alarm";
import { DEFAULT_STATION } from "@/lib/stations";

const WCCG_STREAM_URL = DEFAULT_STATION.streamUrl;

/**
 * useAlarm — monitors the wake-up alarm and auto-plays the stream when due.
 *
 * Checks every 30s if the alarm should fire. When triggered:
 * - Calls resume() or play() from the audio player
 * - Shows a toast notification
 * - Marks the alarm as triggered for today
 */
export function useAlarm() {
  const { resume, play, isPlaying } = useAudioPlayer();
  // Load the saved alarm once on mount from the synchronous localStorage source.
  // loadAlarm() guards `typeof window === "undefined"` (returns null) for static export.
  const [alarm, setAlarm] = useState<AlarmConfig | null>(() => loadAlarm());

  // Check alarm every 30 seconds
  useEffect(() => {
    const check = () => {
      if (isAlarmDue()) {
        // Trigger the alarm — start playing
        if (!isPlaying) {
          play(WCCG_STREAM_URL, {
            streamName: "WCCG 104.5 FM",
            title: "WCCG 104.5 FM",
            artist: "Live Stream",
          });
        } else {
          resume();
        }

        toast.success("Good morning! WCCG is playing.", {
          duration: 6000,
          icon: "☀️",
        });

        markAlarmTriggered();
      }
    };

    check();
    const timer = setInterval(check, 30_000);
    return () => clearInterval(timer);
  }, [isPlaying, resume, play]);

  const updateAlarm = useCallback((config: AlarmConfig) => {
    saveAlarm(config);
    setAlarm(config);
  }, []);

  const clearAlarm = useCallback(() => {
    clearAlarmConfig();
    setAlarm(null);
  }, []);

  return { alarm, updateAlarm, clearAlarm };
}
