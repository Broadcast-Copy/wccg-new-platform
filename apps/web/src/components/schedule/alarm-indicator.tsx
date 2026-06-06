"use client";

import { useState, useEffect } from "react";
import { AlarmClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadAlarm, type AlarmConfig } from "@/lib/alarm";
import { AlarmSetup } from "@/components/schedule/alarm-setup";

/**
 * AlarmIndicator — small alarm icon shown in the player area.
 *
 * Displays the alarm clock icon when an alarm is set, with the
 * alarm time visible on hover. Clicking opens the AlarmSetup dialog.
 */
export function AlarmIndicator() {
  // Initial alarm comes from the synchronous localStorage source via a lazy
  // initializer; the interval below keeps it fresh. (Avoids a mount effect that
  // sets state synchronously — react-hooks/set-state-in-effect.)
  const [alarm, setAlarm] = useState<AlarmConfig | null>(() => loadAlarm());
  const [dialogOpen, setDialogOpen] = useState(false);

  // Re-check periodically. setAlarm runs in the timer callback, which is allowed.
  useEffect(() => {
    const timer = setInterval(() => setAlarm(loadAlarm()), 10_000);
    return () => clearInterval(timer);
  }, []);

  // Re-load when the setup dialog closes (it may have changed the alarm). Doing
  // this in the close handler keeps the setState out of an effect body.
  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setAlarm(loadAlarm());
  };

  const formatAlarmTime = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayHour}:${m.toString().padStart(2, "0")} ${period}`;
  };

  return (
    <>
      <div className="relative group shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDialogOpen(true)}
          aria-label={
            alarm?.enabled
              ? `Alarm set for ${formatAlarmTime(alarm.time)}`
              : "Set wake-up alarm"
          }
          className={`h-8 w-8 rounded-full transition-colors ${
            alarm?.enabled
              ? "text-[#74ddc7] hover:text-[#74ddc7] hover:bg-[#74ddc7]/10"
              : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06]"
          }`}
        >
          <AlarmClock className="h-4 w-4" />
        </Button>

        {/* Tooltip with alarm time */}
        {alarm?.enabled && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[#0a0a0f] border border-border px-2 py-0.5 text-[10px] font-medium text-[#74ddc7] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {formatAlarmTime(alarm.time)} ET
          </div>
        )}
      </div>

      <AlarmSetup open={dialogOpen} onOpenChange={handleDialogOpenChange} />
    </>
  );
}
