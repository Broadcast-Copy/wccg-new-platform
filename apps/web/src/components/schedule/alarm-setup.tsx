"use client";

import { useState, useEffect } from "react";
import { useAlarm } from "@/hooks/use-alarm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlarmClock } from "lucide-react";

const DAYS_OF_WEEK = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

/**
 * AlarmSetup — modal dialog for configuring the wake-up alarm.
 *
 * Lets the user pick a time (HH:MM), select days of the week,
 * and toggle an "Every day" shortcut. Save/Clear buttons persist
 * the alarm config to localStorage.
 */
export function AlarmSetup({
  open,
  onOpenChange,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { alarm, updateAlarm, clearAlarm } = useAlarm();

  const [time, setTime] = useState("06:00");
  const [selectedDays, setSelectedDays] = useState<string[]>(["daily"]);
  const [isDaily, setIsDaily] = useState(true);

  // Sync state from loaded alarm
  useEffect(() => {
    if (alarm) {
      setTime(alarm.time);
      if (alarm.days.includes("daily")) {
        setIsDaily(true);
        setSelectedDays(["daily"]);
      } else {
        setIsDaily(false);
        setSelectedDays(alarm.days);
      }
    }
  }, [alarm]);

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const toggleDaily = () => {
    if (isDaily) {
      setIsDaily(false);
      setSelectedDays(["mon", "tue", "wed", "thu", "fri"]);
    } else {
      setIsDaily(true);
      setSelectedDays(["daily"]);
    }
  };

  const handleSave = () => {
    updateAlarm({
      enabled: true,
      time,
      days: isDaily ? ["daily"] : selectedDays,
    });
    onOpenChange?.(false);
  };

  const handleClear = () => {
    clearAlarm();
    setTime("06:00");
    setSelectedDays(["daily"]);
    setIsDaily(true);
    onOpenChange?.(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#0e0e18] border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <AlarmClock className="h-5 w-5 text-[#74ddc7]" />
            Wake-Up Alarm
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Set an alarm to wake up to WCCG 104.5 FM. The stream will start
            playing automatically at the scheduled time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Time picker */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Alarm Time (ET)
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full rounded-lg border border-border bg-[#0a0a0f] px-4 py-3 text-2xl font-bold text-foreground focus:border-[#74ddc7] focus:outline-none focus:ring-1 focus:ring-[#74ddc7]"
            />
          </div>

          {/* Every day toggle */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Days
              </label>
              <button
                onClick={toggleDaily}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  isDaily
                    ? "bg-[#74ddc7] text-[#0a0a0f]"
                    : "bg-[#74ddc7]/10 text-[#74ddc7] hover:bg-[#74ddc7]/20"
                }`}
              >
                Every Day
              </button>
            </div>

            {/* Day checkboxes */}
            {!isDaily && (
              <div className="flex gap-1.5">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.key}
                    onClick={() => toggleDay(day.key)}
                    className={`flex-1 rounded-lg py-2 text-xs font-medium transition-colors ${
                      selectedDays.includes(day.key)
                        ? "bg-[#7401df] text-white"
                        : "bg-[#0a0a0f] text-muted-foreground hover:bg-[#7401df]/20 hover:text-foreground"
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleClear}
            className="flex-1 border-border text-muted-foreground hover:text-red-400 hover:border-red-400/50"
          >
            Clear Alarm
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isDaily && selectedDays.length === 0}
            className="flex-1 bg-[#74ddc7] text-[#0a0a0f] hover:bg-[#74ddc7]/80 font-semibold"
          >
            Save Alarm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
