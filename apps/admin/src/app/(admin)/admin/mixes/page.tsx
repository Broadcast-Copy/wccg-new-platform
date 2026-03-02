"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Disc3,
  Search,
  Eye,
  EyeOff,
  Trash2,
  Play,
  Clock,
  BarChart3,
} from "lucide-react";

interface Mix {
  id: string;
  title: string;
  hostName: string;
  genre: string;
  duration: number;
  playCount: number;
  status: "PROCESSING" | "PUBLISHED" | "HIDDEN";
  createdAt: string;
}

export default function AdminMixesPage() {
  const [mixes, setMixes] = useState<Mix[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    async function fetchMixes() {
      try {
        const data = await apiClient<Mix[]>("/mixes?admin=true");
        setMixes(data);
      } catch {
        // Use demo data if API isn't ready
        setMixes([
          {
            id: "mix_1",
            title: "Friday Night Vibes Vol. 12",
            hostName: "DJ Ricovelli",
            genre: "Hip Hop",
            duration: 3600,
            playCount: 1243,
            status: "PUBLISHED",
            createdAt: "2026-02-20T20:00:00Z",
          },
          {
            id: "mix_2",
            title: "Throwback Thursday Mix",
            hostName: "DJ SpinWiz",
            genre: "R&B / Soul",
            duration: 2700,
            playCount: 876,
            status: "PUBLISHED",
            createdAt: "2026-02-18T15:00:00Z",
          },
          {
            id: "mix_3",
            title: "Late Night Cruise",
            hostName: "DJ Tony Neal",
            genre: "Hip Hop",
            duration: 4200,
            playCount: 0,
            status: "PROCESSING",
            createdAt: "2026-02-22T23:00:00Z",
          },
          {
            id: "mix_4",
            title: "Sunday Morning Gospel Mix",
            hostName: "DJ Ike GDA",
            genre: "Gospel",
            duration: 1800,
            playCount: 432,
            status: "HIDDEN",
            createdAt: "2026-02-16T08:00:00Z",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchMixes();
  }, []);

  function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  const statusColors: Record<string, string> = {
    PUBLISHED: "bg-green-500/10 text-green-400 border-green-500/20",
    PROCESSING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    HIDDEN: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };

  const filtered = mixes.filter((m) => {
    const matchSearch =
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.hostName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || m.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">DJ Mixes</h1>
          <p className="text-muted-foreground">
            Manage all DJ mix uploads across the platform
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Disc3 className="h-4 w-4" />
          {mixes.length} total mixes
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title or DJ name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
            <SelectItem value="PROCESSING">Processing</SelectItem>
            <SelectItem value="HIDDEN">Hidden</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Disc3 className="h-4 w-4" />
            Published
          </div>
          <p className="text-2xl font-bold mt-1">
            {mixes.filter((m) => m.status === "PUBLISHED").length}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Processing
          </div>
          <p className="text-2xl font-bold mt-1">
            {mixes.filter((m) => m.status === "PROCESSING").length}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Play className="h-4 w-4" />
            Total Plays
          </div>
          <p className="text-2xl font-bold mt-1">
            {mixes.reduce((sum, m) => sum + m.playCount, 0).toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BarChart3 className="h-4 w-4" />
            DJs Active
          </div>
          <p className="text-2xl font-bold mt-1">
            {new Set(mixes.map((m) => m.hostName)).size}
          </p>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 rounded bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>DJ</TableHead>
                <TableHead>Genre</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Plays</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No mixes found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((mix) => (
                  <TableRow key={mix.id}>
                    <TableCell className="font-medium">{mix.title}</TableCell>
                    <TableCell>{mix.hostName}</TableCell>
                    <TableCell>{mix.genre}</TableCell>
                    <TableCell>{formatDuration(mix.duration)}</TableCell>
                    <TableCell>{mix.playCount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusColors[mix.status]}
                      >
                        {mix.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          {mix.status === "HIDDEN" ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
