"use client";

import { useState, useMemo } from "react";
import {
  Search,
  ChevronDown,
  ChevronRight,
  LogIn,
  Plus,
  Pencil,
  Trash2,
  ShieldCheck,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "ROLE_CHANGE";

interface AuditEntry {
  id: string;
  timestamp: string;
  actor: {
    id: string;
    email: string;
    displayName?: string;
  };
  action: AuditAction;
  target: string;
  targetType: string;
  details: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_AUDIT_LOG: AuditEntry[] = [
  {
    id: "aud-001",
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    actor: { id: "u1", email: "admin@wccg.com", displayName: "Station Admin" },
    action: "UPDATE",
    target: "Main Stream",
    targetType: "Stream",
    details: { field: "status", oldValue: "OFFLINE", newValue: "LIVE" },
  },
  {
    id: "aud-002",
    timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    actor: { id: "u2", email: "djmike@wccg.com", displayName: "DJ Mike" },
    action: "CREATE",
    target: "Friday Night Mix Vol. 12",
    targetType: "Mix",
    details: { genre: "Hip-Hop", duration: "01:32:00" },
  },
  {
    id: "aud-003",
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    actor: { id: "u3", email: "sarah@wccg.com", displayName: "Sarah Johnson" },
    action: "LOGIN",
    target: "Admin Dashboard",
    targetType: "Session",
    details: { ip: "192.168.1.42", userAgent: "Chrome/120" },
  },
  {
    id: "aud-004",
    timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    actor: { id: "u1", email: "admin@wccg.com", displayName: "Station Admin" },
    action: "ROLE_CHANGE",
    target: "sarah@wccg.com",
    targetType: "User",
    details: { oldRole: "USER", newRole: "MODERATOR" },
  },
  {
    id: "aud-005",
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    actor: { id: "u4", email: "mod@wccg.com", displayName: "Mod Team" },
    action: "DELETE",
    target: "Spam comment #4821",
    targetType: "Comment",
    details: { reason: "Spam", contentPreview: "Buy followers now..." },
  },
  {
    id: "aud-006",
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    actor: { id: "u2", email: "djmike@wccg.com", displayName: "DJ Mike" },
    action: "UPDATE",
    target: "The Mike Show",
    targetType: "Show",
    details: {
      field: "schedule",
      oldValue: "FRI 20:00-22:00",
      newValue: "FRI 21:00-23:00",
    },
  },
  {
    id: "aud-007",
    timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    actor: { id: "u1", email: "admin@wccg.com", displayName: "Station Admin" },
    action: "CREATE",
    target: "Spring Jam 2026",
    targetType: "Event",
    details: {
      location: "Downtown Amphitheater",
      date: "2026-04-15",
      capacity: 500,
    },
  },
  {
    id: "aud-008",
    timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    actor: { id: "u3", email: "sarah@wccg.com", displayName: "Sarah Johnson" },
    action: "UPDATE",
    target: "Community Page",
    targetType: "Page",
    details: {
      field: "content",
      summary: "Updated service directory listings",
    },
  },
  {
    id: "aud-009",
    timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    actor: { id: "u5", email: "listener@gmail.com", displayName: "John Doe" },
    action: "CREATE",
    target: "New business listing",
    targetType: "Listing",
    details: {
      businessName: "Joe's Barber Shop",
      category: "Services",
      status: "PENDING",
    },
  },
  {
    id: "aud-010",
    timestamp: new Date(Date.now() - 1000 * 60 * 420).toISOString(),
    actor: { id: "u1", email: "admin@wccg.com", displayName: "Station Admin" },
    action: "DELETE",
    target: "Old test stream",
    targetType: "Stream",
    details: { reason: "Cleanup", streamUrl: "rtmp://old.wccg.com/test" },
  },
  {
    id: "aud-011",
    timestamp: new Date(Date.now() - 1000 * 60 * 500).toISOString(),
    actor: { id: "u4", email: "mod@wccg.com", displayName: "Mod Team" },
    action: "UPDATE",
    target: "Comment #3211",
    targetType: "Comment",
    details: {
      field: "status",
      oldValue: "PENDING",
      newValue: "APPROVED",
      reviewNotes: "Content is appropriate",
    },
  },
  {
    id: "aud-012",
    timestamp: new Date(Date.now() - 1000 * 60 * 600).toISOString(),
    actor: { id: "u2", email: "djmike@wccg.com", displayName: "DJ Mike" },
    action: "LOGIN",
    target: "Admin Dashboard",
    targetType: "Session",
    details: { ip: "10.0.0.15", userAgent: "Firefox/121" },
  },
  {
    id: "aud-013",
    timestamp: new Date(Date.now() - 1000 * 60 * 700).toISOString(),
    actor: { id: "u1", email: "admin@wccg.com", displayName: "Station Admin" },
    action: "ROLE_CHANGE",
    target: "djmike@wccg.com",
    targetType: "User",
    details: { oldRole: "USER", newRole: "HOST" },
  },
  {
    id: "aud-014",
    timestamp: new Date(Date.now() - 1000 * 60 * 800).toISOString(),
    actor: { id: "u3", email: "sarah@wccg.com", displayName: "Sarah Johnson" },
    action: "CREATE",
    target: "Weekly Newsletter",
    targetType: "Notification",
    details: {
      type: "EMAIL",
      recipientCount: 245,
      subject: "This Week at WCCG",
    },
  },
  {
    id: "aud-015",
    timestamp: new Date(Date.now() - 1000 * 60 * 900).toISOString(),
    actor: { id: "u1", email: "admin@wccg.com", displayName: "Station Admin" },
    action: "UPDATE",
    target: "Points Configuration",
    targetType: "Settings",
    details: {
      field: "listenPointsRate",
      oldValue: "1 per minute",
      newValue: "2 per minute",
    },
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ITEMS_PER_PAGE = 10;

function formatTimestamp(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function actionBadgeClass(action: AuditAction) {
  switch (action) {
    case "CREATE":
      return "bg-green-600 hover:bg-green-600";
    case "UPDATE":
      return "bg-blue-600 hover:bg-blue-600";
    case "DELETE":
      return "bg-red-600 hover:bg-red-600";
    case "LOGIN":
      return "bg-gray-500 hover:bg-gray-500";
    case "ROLE_CHANGE":
      return "bg-purple-600 hover:bg-purple-600";
    default:
      return "";
  }
}

function actionIcon(action: AuditAction) {
  switch (action) {
    case "CREATE":
      return Plus;
    case "UPDATE":
      return Pencil;
    case "DELETE":
      return Trash2;
    case "LOGIN":
      return LogIn;
    case "ROLE_CHANGE":
      return ShieldCheck;
    default:
      return Pencil;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminAuditPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("ALL");
  const [actorFilter, setActorFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Derive unique actors for filter
  const uniqueActors = useMemo(() => {
    const map = new Map<string, string>();
    MOCK_AUDIT_LOG.forEach((entry) => {
      map.set(
        entry.actor.id,
        entry.actor.displayName ?? entry.actor.email
      );
    });
    return Array.from(map.entries()); // [id, label]
  }, []);

  // Filter & search
  const filteredEntries = useMemo(() => {
    return MOCK_AUDIT_LOG.filter((entry) => {
      if (actionFilter !== "ALL" && entry.action !== actionFilter) return false;
      if (actorFilter !== "ALL" && entry.actor.id !== actorFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const searchable = [
          entry.target,
          entry.targetType,
          entry.actor.email,
          entry.actor.displayName ?? "",
          entry.action,
          JSON.stringify(entry.details),
        ]
          .join(" ")
          .toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }, [searchQuery, actionFilter, actorFilter]);

  // Pagination
  const totalPages = Math.max(
    1,
    Math.ceil(filteredEntries.length / ITEMS_PER_PAGE)
  );
  const paginatedEntries = filteredEntries.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when filters change
  function handleFilterChange<T>(setter: (v: T) => void, value: T) {
    setter(value);
    setCurrentPage(1);
  }

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track all administrative actions across the platform. A dedicated
            API endpoint is planned; showing sample data for now.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search actions, targets, details..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) =>
              handleFilterChange(setSearchQuery, e.target.value)
            }
          />
        </div>
        <Select
          value={actorFilter}
          onValueChange={(v) => handleFilterChange(setActorFilter, v)}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Actors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Actors</SelectItem>
            {uniqueActors.map(([id, label]) => (
              <SelectItem key={id} value={id}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={actionFilter}
          onValueChange={(v) => handleFilterChange(setActionFilter, v)}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Actions</SelectItem>
            <SelectItem value="CREATE">Create</SelectItem>
            <SelectItem value="UPDATE">Update</SelectItem>
            <SelectItem value="DELETE">Delete</SelectItem>
            <SelectItem value="LOGIN">Login</SelectItem>
            <SelectItem value="ROLE_CHANGE">Role Change</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filteredEntries.length === 0 ? (
        <div className="rounded-lg border p-8">
          <p className="text-center text-muted-foreground">
            No audit entries match your filters.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30px]" />
                <TableHead>Timestamp</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedEntries.map((entry) => {
                const isExpanded = expandedRows.has(entry.id);
                const Icon = actionIcon(entry.action);
                return (
                  <TableRow
                    key={entry.id}
                    className="group cursor-pointer"
                    onClick={() => toggleRow(entry.id)}
                  >
                    <TableCell className="pr-0">
                      {isExpanded ? (
                        <ChevronDown className="size-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="size-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatTimestamp(entry.timestamp)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">
                          {entry.actor.displayName ?? entry.actor.email}
                        </p>
                        {entry.actor.displayName && (
                          <p className="text-xs text-muted-foreground">
                            {entry.actor.email}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={actionBadgeClass(entry.action)}>
                        <Icon className="mr-1 size-3" />
                        {entry.action.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{entry.target}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.targetType}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {isExpanded ? (
                        <pre className="max-w-[400px] overflow-auto rounded bg-muted/50 p-2 text-xs">
                          {JSON.stringify(entry.details, null, 2)}
                        </pre>
                      ) : (
                        <p className="max-w-[200px] truncate text-sm text-muted-foreground">
                          {Object.entries(entry.details)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(", ")}
                        </p>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}&ndash;
            {Math.min(currentPage * ITEMS_PER_PAGE, filteredEntries.length)} of{" "}
            {filteredEntries.length} entries
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="size-4" />
              <span className="sr-only">First page</span>
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="size-4" />
              <span className="sr-only">Previous page</span>
            </Button>
            <span className="px-2 text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="size-4" />
              <span className="sr-only">Next page</span>
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="size-4" />
              <span className="sr-only">Last page</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
