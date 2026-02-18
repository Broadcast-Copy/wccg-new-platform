import { ScheduleGrid } from "@/components/schedule/schedule-grid";

export const metadata = {
  title: "Schedule | WCCG 104.5 FM",
};

export default function SchedulePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Weekly Schedule</h1>
        <p className="text-muted-foreground">
          See what&apos;s playing throughout the week
        </p>
      </div>
      <ScheduleGrid />
    </div>
  );
}
