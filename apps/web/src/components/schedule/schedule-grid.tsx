"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface ScheduleSlot {
  id: string;
  stream_id: string;
  show_id: string;
  show_title: string;
  host_name?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  color?: string;
}

interface ScheduleGridProps {
  schedule: ScheduleSlot[];
}

const DAYS = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
  { label: "Sun", value: 0 },
];

const TIME_SLOTS = [
  "06:00",
  "08:00",
  "10:00",
  "12:00",
  "14:00",
  "16:00",
  "18:00",
  "20:00",
  "22:00",
];

const TIME_LABELS: Record<string, string> = {
  "06:00": "6:00 AM",
  "08:00": "8:00 AM",
  "10:00": "10:00 AM",
  "12:00": "12:00 PM",
  "14:00": "2:00 PM",
  "16:00": "4:00 PM",
  "18:00": "6:00 PM",
  "20:00": "8:00 PM",
  "22:00": "10:00 PM",
};

const SHOW_COLORS = [
  "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
  "bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20",
  "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20",
];

export function ScheduleGrid({ schedule }: ScheduleGridProps) {
  const today = new Date().getDay();
  const [selectedDay, setSelectedDay] = useState<string>(String(today));

  // Build a map of show_id -> color
  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    const uniqueShows = [...new Set(schedule.map((s) => s.show_id))];
    uniqueShows.forEach((showId, index) => {
      map.set(showId, SHOW_COLORS[index % SHOW_COLORS.length]);
    });
    return map;
  }, [schedule]);

  // Get current hour for "now" indicator
  const currentHour = new Date().getHours();

  function getSlotForDayAndTime(dayOfWeek: number, timeSlot: string) {
    const hour = parseInt(timeSlot.split(":")[0], 10);
    return schedule.find((slot) => {
      const slotStartHour = parseInt(slot.start_time.split(":")[0], 10);
      const slotEndHour = parseInt(slot.end_time.split(":")[0], 10);
      return (
        slot.day_of_week === dayOfWeek &&
        slotStartHour <= hour &&
        slotEndHour > hour
      );
    });
  }

  if (schedule.length === 0) {
    return (
      <div className="space-y-4">
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Time</TableHead>
                {DAYS.map((day) => (
                  <TableHead key={day.value}>{day.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {TIME_SLOTS.map((slot) => (
                <TableRow key={slot}>
                  <TableCell className="font-medium">
                    {TIME_LABELS[slot]}
                  </TableCell>
                  {DAYS.map((day) => (
                    <TableCell
                      key={`${day.value}-${slot}`}
                      className="text-muted-foreground"
                    >
                      &mdash;
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Schedule data will appear once the API is connected.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Day selector for mobile */}
      <div className="md:hidden">
        <Tabs value={selectedDay} onValueChange={setSelectedDay}>
          <TabsList className="w-full">
            {DAYS.map((day) => (
              <TabsTrigger key={day.value} value={String(day.value)}>
                {day.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="mt-4 space-y-2">
          {TIME_SLOTS.map((timeSlot) => {
            const slot = getSlotForDayAndTime(
              parseInt(selectedDay),
              timeSlot,
            );
            const slotHour = parseInt(timeSlot.split(":")[0], 10);
            const isNow =
              parseInt(selectedDay) === today &&
              slotHour <= currentHour &&
              slotHour + 2 > currentHour;

            return (
              <div
                key={timeSlot}
                className={`flex items-center gap-3 rounded-lg border p-3 ${
                  isNow ? "ring-2 ring-primary" : ""
                }`}
              >
                <span className="w-20 shrink-0 text-sm font-medium text-muted-foreground">
                  {TIME_LABELS[timeSlot]}
                </span>
                {slot ? (
                  <div
                    className={`flex-1 rounded-md border px-3 py-1.5 ${
                      colorMap.get(slot.show_id) || ""
                    }`}
                  >
                    <p className="text-sm font-medium">{slot.show_title}</p>
                    {slot.host_name && (
                      <p className="text-xs opacity-80">
                        {slot.host_name}
                      </p>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    &mdash;
                  </span>
                )}
                {isNow && (
                  <Badge variant="default" className="shrink-0">
                    NOW
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Full table for desktop */}
      <div className="hidden overflow-x-auto rounded-lg border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Time</TableHead>
              {DAYS.map((day) => (
                <TableHead
                  key={day.value}
                  className={day.value === today ? "bg-primary/5" : ""}
                >
                  {day.label}
                  {day.value === today && (
                    <Badge variant="outline" className="ml-1 text-xs">
                      Today
                    </Badge>
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {TIME_SLOTS.map((timeSlot) => {
              const slotHour = parseInt(timeSlot.split(":")[0], 10);
              const isCurrentTimeSlot =
                slotHour <= currentHour && slotHour + 2 > currentHour;

              return (
                <TableRow
                  key={timeSlot}
                  className={isCurrentTimeSlot ? "bg-primary/5" : ""}
                >
                  <TableCell className="font-medium">
                    {TIME_LABELS[timeSlot]}
                  </TableCell>
                  {DAYS.map((day) => {
                    const slot = getSlotForDayAndTime(
                      day.value,
                      timeSlot,
                    );
                    const isNow =
                      day.value === today && isCurrentTimeSlot;

                    return (
                      <TableCell
                        key={`${day.value}-${timeSlot}`}
                        className={day.value === today ? "bg-primary/5" : ""}
                      >
                        {slot ? (
                          <div
                            className={`rounded-md border px-2 py-1 ${
                              colorMap.get(slot.show_id) || ""
                            } ${isNow ? "ring-2 ring-primary" : ""}`}
                          >
                            <p className="text-xs font-medium">
                              {slot.show_title}
                            </p>
                            {slot.host_name && (
                              <p className="text-xs opacity-70">
                                {slot.host_name}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">
                            &mdash;
                          </span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
