"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Radio,
  Search,
  Plus,
  MoreHorizontal,
  Headphones,
  Music,
  Play,
  Pause,
  Clock,
  CalendarDays,
  Star,
  Users,
  CheckCircle,
  ArrowLeft,
  Download,
  Mic2,
  Upload,
} from "lucide-react";
import { useDemoRole } from "../layout";
import { ROLE_CONFIGS } from "../_lib/role-config";

// ---------------------------------------------------------------------------
// Mock shows data
// ---------------------------------------------------------------------------

interface MockShowRow {
  id: string;
  name: string;
  host: string;
  genre: string;
  day: string;
  time: string;
  status: "live" | "upcoming" | "recorded" | "off-air";
  avgListeners: string;
  totalEpisodes: number;
  rating: string;
}

const MOCK_SHOWS: MockShowRow[] = [
  { id: "s1", name: "Friday Night Fire", host: "DJ SpinWiz", genre: "Hip-Hop / R&B", day: "Friday", time: "8:00 PM - 10:00 PM", status: "upcoming", avgListeners: "3.2K", totalEpisodes: 52, rating: "4.9" },
  { id: "s2", name: "Saturday Night Mixtape", host: "DJ SpinWiz", genre: "Dance / Electronic", day: "Saturday", time: "9:00 PM - 11:00 PM", status: "upcoming", avgListeners: "4.1K", totalEpisodes: 48, rating: "4.8" },
  { id: "s3", name: "Midday Mix", host: "DJ SpinWiz", genre: "Soul / Classics", day: "Wednesday", time: "12:00 PM - 2:00 PM", status: "recorded", avgListeners: "1.8K", totalEpisodes: 45, rating: "4.7" },
  { id: "s4", name: "Morning Drive", host: "Big Mike", genre: "Urban / Top 40", day: "Mon-Fri", time: "6:00 AM - 10:00 AM", status: "live", avgListeners: "5.6K", totalEpisodes: 220, rating: "4.8" },
  { id: "s5", name: "Community Voices", host: "Aisha Reynolds", genre: "Talk / Community", day: "Tuesday", time: "7:00 PM - 8:00 PM", status: "upcoming", avgListeners: "2.1K", totalEpisodes: 42, rating: "4.6" },
  { id: "s6", name: "Sunday Gospel Hour", host: "Pastor James", genre: "Gospel", day: "Sunday", time: "8:00 AM - 10:00 AM", status: "upcoming", avgListeners: "3.8K", totalEpisodes: 104, rating: "4.9" },
  { id: "s7", name: "Late Night Chill", host: "Sarah Chen", genre: "Lo-fi / Jazz", day: "Thu-Sat", time: "11:00 PM - 1:00 AM", status: "off-air", avgListeners: "1.2K", totalEpisodes: 36, rating: "4.5" },
  { id: "s8", name: "Weekend Countdown", host: "Big Mike", genre: "Pop / Top 40", day: "Saturday", time: "10:00 AM - 12:00 PM", status: "upcoming", avgListeners: "2.9K", totalEpisodes: 48, rating: "4.7" },
  { id: "s9", name: "The Underground", host: "DJ SpinWiz", genre: "Underground Hip-Hop", day: "Thursday", time: "10:00 PM - 12:00 AM", status: "upcoming", avgListeners: "1.5K", totalEpisodes: 24, rating: "4.8" },
  { id: "s10", name: "Sports Talk Live", host: "Derek Owens", genre: "Sports / Talk", day: "Mon/Wed/Fri", time: "4:00 PM - 5:00 PM", status: "off-air", avgListeners: "1.9K", totalEpisodes: 67, rating: "4.4" },
];

// ---------------------------------------------------------------------------
// Status Message
// ---------------------------------------------------------------------------

function useStatusMessage() {
  const [message, setMessage] = useState<string | null>(null);
  const showMessage = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 2500);
  }, []);
  return { message, showMessage };
}

function StatusToast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="rounded-lg border border-border bg-popover px-4 py-3 text-sm text-foreground shadow-lg">
        <div className="flex items-center gap-2">
          <CheckCircle className="size-4 text-[#74ddc7]" />
          {message}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ShowsPage() {
  const { role } = useDemoRole();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { message, showMessage } = useStatusMessage();

  useEffect(() => {
    if (role === null) {
      router.replace("/portal");
    }
  }, [role, router]);

  if (!role) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-border border-t-[#74ddc7]" />
      </div>
    );
  }

  const config = ROLE_CONFIGS[role];

  // For DJ role, only show their shows
  const roleFilteredShows =
    role === "dj"
      ? MOCK_SHOWS.filter((s) => s.host === "DJ SpinWiz")
      : MOCK_SHOWS;

  const filteredShows = roleFilteredShows.filter((show) => {
    const matchesSearch =
      show.name.toLowerCase().includes(search.toLowerCase()) ||
      show.host.toLowerCase().includes(search.toLowerCase()) ||
      show.genre.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "all" || show.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      live: "border-[#ef4444]/30 bg-[#ef4444]/10 text-[#ef4444]",
      upcoming: "border-[#10b981]/30 bg-[#10b981]/10 text-[#10b981]",
      recorded: "border-[#3b82f6]/30 bg-[#3b82f6]/10 text-[#3b82f6]",
      "off-air": "border-border bg-foreground/5 text-muted-foreground",
    };
    return colors[status] || "";
  };

  const liveCount = roleFilteredShows.filter((s) => s.status === "live").length;
  const totalEpisodes = roleFilteredShows.reduce((sum, s) => sum + s.totalEpisodes, 0);

  const pageTitle = role === "dj" ? "My Shows" : "Show Management";
  const pageDesc = role === "dj"
    ? "Manage your shows, schedule, and episodes"
    : "Manage all platform shows, hosts, and schedules";

  return (
    <div className="space-y-6">
      <StatusToast message={message} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              asChild
            >
              <Link href="/portal/overview">
                <ArrowLeft className="mr-1 size-4" />
                Back
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {pageTitle}
          </h1>
          <p className="text-muted-foreground">{pageDesc}</p>
        </div>
        <div className="flex items-center gap-2">
          {role === "dj" && (
            <Button
              variant="outline"
              className="border-border text-muted-foreground hover:text-foreground"
              onClick={() => showMessage("Opening upload dialog...")}
            >
              <Upload className="mr-2 size-4" />
              Upload Mix
            </Button>
          )}
          <Button
            style={{ backgroundColor: config.accentColor }}
            className="text-white"
            onClick={() => showMessage(role === "dj" ? "Going live..." : "Creating new show...")}
          >
            {role === "dj" ? (
              <>
                <Radio className="mr-2 size-4" />
                Go Live
              </>
            ) : (
              <>
                <Plus className="mr-2 size-4" />
                New Show
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Shows</p>
                <p className="text-2xl font-bold text-foreground">{roleFilteredShows.length}</p>
              </div>
              <div className="rounded-lg bg-[#74ddc7]/10 p-2">
                <Radio className="size-5 text-[#74ddc7]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Live Now</p>
                <p className="text-2xl font-bold text-foreground">{liveCount}</p>
              </div>
              <div className="rounded-lg bg-[#ef4444]/10 p-2">
                <Mic2 className="size-5 text-[#ef4444]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Episodes</p>
                <p className="text-2xl font-bold text-foreground">{totalEpisodes}</p>
              </div>
              <div className="rounded-lg bg-[#7401df]/10 p-2">
                <Music className="size-5 text-[#7401df]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Rating</p>
                <p className="text-2xl font-bold text-foreground">4.7</p>
              </div>
              <div className="rounded-lg bg-[#f97316]/10 p-2">
                <Star className="size-5 text-[#f97316]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="border-border bg-card">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search shows by name, host, or genre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-border bg-foreground/5 pl-10 text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-md border border-border bg-foreground/5 px-3 py-2 text-sm text-foreground"
            >
              <option value="all">All Status</option>
              <option value="live">Live</option>
              <option value="upcoming">Upcoming</option>
              <option value="recorded">Recorded</option>
              <option value="off-air">Off-Air</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Shows Table */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-foreground">Shows</CardTitle>
            <Badge variant="outline" className="border-border text-muted-foreground">
              {filteredShows.length} results
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Show</TableHead>
                {role !== "dj" && (
                  <TableHead className="text-muted-foreground">Host</TableHead>
                )}
                <TableHead className="text-muted-foreground">Schedule</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Avg Listeners</TableHead>
                <TableHead className="text-muted-foreground">Episodes</TableHead>
                <TableHead className="text-muted-foreground">Rating</TableHead>
                <TableHead className="text-right text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredShows.map((show) => (
                <TableRow
                  key={show.id}
                  className="cursor-pointer border-border transition-colors hover:bg-foreground/5"
                  onClick={() => showMessage(`Viewing show: ${show.name}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className="flex size-9 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${config.accentColor}15` }}
                      >
                        {show.status === "live" ? (
                          <Radio className="size-4 text-[#ef4444]" />
                        ) : (
                          <Headphones className="size-4" style={{ color: config.accentColor }} />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{show.name}</p>
                        <p className="text-xs text-muted-foreground">{show.genre}</p>
                      </div>
                    </div>
                  </TableCell>
                  {role !== "dj" && (
                    <TableCell className="text-sm text-muted-foreground">{show.host}</TableCell>
                  )}
                  <TableCell>
                    <div>
                      <p className="text-sm text-foreground">{show.day}</p>
                      <p className="text-xs text-muted-foreground">{show.time}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusBadge(show.status)}>
                      {show.status === "live" && (
                        <span className="mr-1 inline-block size-1.5 animate-pulse rounded-full bg-[#ef4444]" />
                      )}
                      {show.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{show.avgListeners}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{show.totalEpisodes}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className="size-3 text-[#f97316]" />
                      <span className="text-sm text-muted-foreground">{show.rating}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        showMessage(`Actions for ${show.name}`);
                      }}
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredShows.length === 0 && (
            <div className="py-12 text-center">
              <Radio className="mx-auto size-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">No shows found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
