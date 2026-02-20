import { ScheduleGrid } from "@/components/schedule/schedule-grid";
import { Calendar } from "lucide-react";

export const metadata = {
  title: "Schedule | WCCG 104.5 FM",
};

async function getSchedule() {
  try {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
    const res = await fetch(
      `${apiUrl}/schedule?streamId=stream_main`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function SchedulePage() {
  const schedule = await getSchedule();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Calendar className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">
            Weekly Schedule
          </h1>
        </div>
        <p className="mt-1 text-muted-foreground">
          See what&apos;s playing throughout the week on WCCG 104.5 FM
        </p>
      </div>
      <ScheduleGrid schedule={schedule} />
    </div>
  );
}
