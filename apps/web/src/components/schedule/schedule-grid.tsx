"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const TIME_SLOTS = [
  "6:00 AM",
  "8:00 AM",
  "10:00 AM",
  "12:00 PM",
  "2:00 PM",
  "4:00 PM",
  "6:00 PM",
  "8:00 PM",
  "10:00 PM",
];

export function ScheduleGrid() {
  // TODO: Fetch schedule data from API
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">Time</TableHead>
            {DAYS.map((day) => (
              <TableHead key={day}>{day}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {TIME_SLOTS.map((slot) => (
            <TableRow key={slot}>
              <TableCell className="font-medium">{slot}</TableCell>
              {DAYS.map((day) => (
                <TableCell
                  key={`${day}-${slot}`}
                  className="text-muted-foreground"
                >
                  {/* TODO: Render show block */}
                  &mdash;
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
