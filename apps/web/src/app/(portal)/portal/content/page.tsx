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
  Mic,
  Music,
  Search,
  Plus,
  MoreHorizontal,
  Play,
  Eye,
  Upload,
  FileText,
  Video,
  Users,
  TrendingUp,
  CheckCircle,
  ArrowLeft,
  Download,
  Edit,
  Trash2,
  Clock,
  BarChart3,
} from "lucide-react";
import { useDemoRole } from "../layout";
import { ROLE_CONFIGS } from "../_lib/role-config";

// ---------------------------------------------------------------------------
// Mock content data
// ---------------------------------------------------------------------------

interface MockContentRow {
  id: string;
  title: string;
  type: "podcast" | "music" | "video" | "article";
  status: "published" | "draft" | "review" | "scheduled";
  plays: string;
  duration: string;
  date: string;
  fileSize: string;
}

const MOCK_CONTENT: MockContentRow[] = [
  { id: "ct1", title: "Community Voices #42", type: "podcast", status: "published", plays: "1,247", duration: "42:15", date: "Mar 3, 2026", fileSize: "38 MB" },
  { id: "ct2", title: "Fayetteville Anthem", type: "music", status: "published", plays: "3,891", duration: "3:45", date: "Feb 28, 2026", fileSize: "8.2 MB" },
  { id: "ct3", title: "Behind the Scenes Ep. 8", type: "video", status: "draft", plays: "0", duration: "15:30", date: "Mar 4, 2026", fileSize: "245 MB" },
  { id: "ct4", title: "Community Voices #43", type: "podcast", status: "draft", plays: "0", duration: "0:00", date: "Mar 5, 2026", fileSize: "--" },
  { id: "ct5", title: "Late Night Grooves", type: "music", status: "published", plays: "2,103", duration: "4:12", date: "Feb 20, 2026", fileSize: "9.1 MB" },
  { id: "ct6", title: "Studio Session Highlights", type: "video", status: "review", plays: "0", duration: "22:08", date: "Mar 2, 2026", fileSize: "380 MB" },
  { id: "ct7", title: "Community Voices #41", type: "podcast", status: "published", plays: "1,876", duration: "38:42", date: "Feb 24, 2026", fileSize: "35 MB" },
  { id: "ct8", title: "Morning Motivation Mix", type: "music", status: "published", plays: "956", duration: "5:20", date: "Feb 15, 2026", fileSize: "11 MB" },
  { id: "ct9", title: "Local Business Spotlight", type: "article", status: "published", plays: "423", duration: "--", date: "Feb 10, 2026", fileSize: "2 KB" },
  { id: "ct10", title: "Spring Vibes Playlist", type: "music", status: "scheduled", plays: "0", duration: "3:55", date: "Mar 10, 2026", fileSize: "8.5 MB" },
  { id: "ct11", title: "Community Voices #40", type: "podcast", status: "published", plays: "2,341", duration: "45:10", date: "Feb 17, 2026", fileSize: "41 MB" },
  { id: "ct12", title: "Artist Interview: MC Flow", type: "video", status: "published", plays: "5,672", duration: "28:45", date: "Feb 12, 2026", fileSize: "450 MB" },
  { id: "ct13", title: "Sunset Serenade", type: "music", status: "draft", plays: "0", duration: "4:30", date: "Mar 5, 2026", fileSize: "9.8 MB" },
  { id: "ct14", title: "Weekly Wrap-Up", type: "article", status: "draft", plays: "0", duration: "--", date: "Mar 4, 2026", fileSize: "1.5 KB" },
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

export default function ContentPage() {
  const { role } = useDemoRole();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
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

  const filteredContent = MOCK_CONTENT.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "all" || item.type === filterType;
    const matchesStatus = filterStatus === "all" || item.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      published: "border-[#10b981]/30 bg-[#10b981]/10 text-[#10b981]",
      draft: "border-border bg-foreground/5 text-muted-foreground",
      review: "border-[#f97316]/30 bg-[#f97316]/10 text-[#f97316]",
      scheduled: "border-[#3b82f6]/30 bg-[#3b82f6]/10 text-[#3b82f6]",
    };
    return colors[status] || "";
  };

  const typeBadge = (type: string) => {
    const colors: Record<string, string> = {
      podcast: "border-[#7401df]/30 bg-[#7401df]/10 text-[#7401df]",
      music: "border-[#74ddc7]/30 bg-[#74ddc7]/10 text-[#74ddc7]",
      video: "border-[#f97316]/30 bg-[#f97316]/10 text-[#f97316]",
      article: "border-[#3b82f6]/30 bg-[#3b82f6]/10 text-[#3b82f6]",
    };
    return colors[type] || "";
  };

  const TypeIcon = ({ type }: { type: string }) => {
    if (type === "podcast") return <Mic className="size-4 text-[#7401df]" />;
    if (type === "music") return <Music className="size-4 text-[#74ddc7]" />;
    if (type === "video") return <Video className="size-4 text-[#f97316]" />;
    return <FileText className="size-4 text-[#3b82f6]" />;
  };

  const publishedCount = MOCK_CONTENT.filter((c) => c.status === "published").length;
  const draftCount = MOCK_CONTENT.filter((c) => c.status === "draft").length;
  const totalPlays = MOCK_CONTENT.reduce((sum, c) => {
    const val = parseInt(c.plays.replace(/,/g, ""), 10);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

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
            Content Management
          </h1>
          <p className="text-muted-foreground">
            Create, manage, and publish your content
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-border text-muted-foreground hover:text-foreground"
            onClick={() => showMessage("Exporting content data...")}
          >
            <Download className="mr-2 size-4" />
            Export
          </Button>
          <Button
            style={{ backgroundColor: config.accentColor }}
            className="text-white"
            onClick={() => showMessage("Opening upload dialog...")}
          >
            <Upload className="mr-2 size-4" />
            Upload Content
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Published</p>
                <p className="text-2xl font-bold text-foreground">{publishedCount}</p>
              </div>
              <div className="rounded-lg bg-[#10b981]/10 p-2">
                <CheckCircle className="size-5 text-[#10b981]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Drafts</p>
                <p className="text-2xl font-bold text-foreground">{draftCount}</p>
              </div>
              <div className="rounded-lg bg-[#f97316]/10 p-2">
                <Edit className="size-5 text-[#f97316]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Plays</p>
                <p className="text-2xl font-bold text-foreground">{totalPlays.toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-[#74ddc7]/10 p-2">
                <Play className="size-5 text-[#74ddc7]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Subscribers</p>
                <p className="text-2xl font-bold text-foreground">1,247</p>
              </div>
              <div className="rounded-lg bg-[#3b82f6]/10 p-2">
                <Users className="size-5 text-[#3b82f6]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Create New</CardTitle>
          <CardDescription>Choose a content type to create</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { label: "New Podcast", icon: Mic, color: "#7401df" },
              { label: "Upload Music", icon: Music, color: "#74ddc7" },
              { label: "Upload Video", icon: Video, color: "#f97316" },
              { label: "Write Article", icon: FileText, color: "#3b82f6" },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.label}
                  variant="outline"
                  className="justify-start border-border bg-foreground/5 transition-all hover:bg-foreground/8"
                  style={{
                    // @ts-expect-error -- custom css property
                    "--hover-border": action.color,
                  }}
                  onClick={() => showMessage(`Opening ${action.label}...`)}
                >
                  <Icon className="mr-2 size-4" style={{ color: action.color }} />
                  {action.label}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Search and Filter */}
      <Card className="border-border bg-card">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search content by title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-border bg-foreground/5 pl-10 text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="rounded-md border border-border bg-foreground/5 px-3 py-2 text-sm text-foreground"
              >
                <option value="all">All Types</option>
                <option value="podcast">Podcast</option>
                <option value="music">Music</option>
                <option value="video">Video</option>
                <option value="article">Article</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-md border border-border bg-foreground/5 px-3 py-2 text-sm text-foreground"
              >
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="review">In Review</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Table */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-foreground">All Content</CardTitle>
            <Badge variant="outline" className="border-border text-muted-foreground">
              {filteredContent.length} items
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Title</TableHead>
                <TableHead className="text-muted-foreground">Type</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Duration</TableHead>
                <TableHead className="text-muted-foreground">Plays</TableHead>
                <TableHead className="text-muted-foreground">Date</TableHead>
                <TableHead className="text-muted-foreground">Size</TableHead>
                <TableHead className="text-right text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContent.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer border-border transition-colors hover:bg-foreground/5"
                  onClick={() => showMessage(`Opening: ${item.title}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-foreground/5">
                        <TypeIcon type={item.type} />
                      </div>
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={typeBadge(item.type)}>
                      {item.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusBadge(item.status)}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.duration}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.plays}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.date}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.fileSize}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {item.status === "published" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            showMessage(`Viewing analytics for ${item.title}`);
                          }}
                        >
                          <BarChart3 className="size-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          showMessage(`Editing ${item.title}`);
                        }}
                      >
                        <Edit className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-[#ef4444]"
                        onClick={(e) => {
                          e.stopPropagation();
                          showMessage(`Delete ${item.title}? (Demo mode)`);
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredContent.length === 0 && (
            <div className="py-12 text-center">
              <Mic className="mx-auto size-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">No content found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
