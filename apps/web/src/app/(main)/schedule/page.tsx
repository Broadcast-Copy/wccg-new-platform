import { ScheduleGrid } from "@/components/schedule/schedule-grid";
import { Calendar, Clock, Radio, Zap } from "lucide-react";

export const metadata = {
  title: "Schedule | WCCG 104.5 FM",
  description: "View the full weekly programming schedule for WCCG 104.5 FM — shows, hosts, and time slots.",
};

interface ScheduleBlock {
  id: string;
  streamId: string;
  showId: string | null;
  title: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

async function getSchedule(): Promise<ScheduleBlock[]> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
    const res = await fetch(`${apiUrl}/schedule?streamId=stream_wccg`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function SchedulePage() {
  const schedule = await getSchedule();
  const activeBlocks = schedule.filter((s) => s.isActive);
  const daysCovered = new Set(activeBlocks.map((s) => s.dayOfWeek)).size;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-cyan-950/50 to-gray-900 border border-border/30">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(circle at 25% 50%, rgba(6,182,212,0.3) 0%, transparent 50%), radial-gradient(circle at 75% 40%, rgba(99,102,241,0.2) 0%, transparent 50%)` }} />
        </div>
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-xl shadow-cyan-500/20">
              <Calendar className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">Weekly Schedule</h1>
              <p className="text-base text-gray-400 max-w-2xl">See what&apos;s playing throughout the week on WCCG 104.5 FM — shows, hosts, and time slots for every channel.</p>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 px-4 py-3">
              <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-cyan-400" /><span className="text-sm font-medium text-gray-300">Time Slots</span></div>
              <p className="mt-1 text-2xl font-bold text-white">{activeBlocks.length}</p>
            </div>
            <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 px-4 py-3">
              <div className="flex items-center gap-2"><Radio className="h-4 w-4 text-indigo-400" /><span className="text-sm font-medium text-gray-300">Days</span></div>
              <p className="mt-1 text-2xl font-bold text-white">{daysCovered || 7}</p>
            </div>
            <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 px-4 py-3">
              <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-amber-400" /><span className="text-sm font-medium text-gray-300">Broadcast</span></div>
              <p className="mt-1 text-2xl font-bold text-white">24/7</p>
            </div>
          </div>
        </div>
      </div>

      {schedule.length > 0 ? (
        <ScheduleGrid schedule={schedule} />
      ) : (
        <div className="flex flex-col h-48 items-center justify-center rounded-2xl border border-dashed border-border/50 bg-muted/20">
          <Calendar className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Schedule data will appear once the API is connected.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Check back soon for the full weekly programming guide</p>
        </div>
      )}
    </div>
  );
}
