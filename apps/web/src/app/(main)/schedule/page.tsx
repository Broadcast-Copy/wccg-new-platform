import { ScheduleGrid } from "@/components/schedule/schedule-grid";
import { Calendar } from "lucide-react";

export const metadata = {
  title: "Schedule | WCCG 104.5 FM",
  description: "View the full weekly programming schedule for WCCG 104.5 FM — shows, hosts, and time slots.",
};

export default function SchedulePage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Calendar className="h-6 w-6 text-[#74ddc7]" />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Schedule of Programs
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          WCCG 104.5 FM — Full weekly programming lineup
        </p>
      </div>

      {/* Schedule Tiles */}
      <ScheduleGrid />
    </div>
  );
}
