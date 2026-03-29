"use client";

import { useState, useEffect, useMemo } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  Search,
  ScrollText,
  Loader2,
  RefreshCw,
  Calendar,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuditEntry {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  target: string | null;
  details: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Seed data (shown if table is empty or query fails)
// ---------------------------------------------------------------------------

const SEED_ENTRIES: AuditEntry[] = [
  { id: "seed-1", user_id: null, user_email: "admin@wccg1045fm.com", action: "user.login", target: "auth", details: "Admin signed in from Chrome/Windows", created_at: new Date(Date.now() - 5 * 60_000).toISOString() },
  { id: "seed-2", user_id: null, user_email: "marcus@wccg1045fm.com", action: "profile.update", target: "profiles", details: "Updated display_name to 'Marcus T.'", created_at: new Date(Date.now() - 15 * 60_000).toISOString() },
  { id: "seed-3", user_id: null, user_email: "keisha@wccg1045fm.com", action: "content.create", target: "hub_posts", details: "Created new community post", created_at: new Date(Date.now() - 32 * 60_000).toISOString() },
  { id: "seed-4", user_id: null, user_email: "admin@wccg1045fm.com", action: "user.role_change", target: "profiles", details: "Changed user_type from 'listener' to 'vendor' for user abc123", created_at: new Date(Date.now() - 60 * 60_000).toISOString() },
  { id: "seed-5", user_id: null, user_email: "system", action: "fee.update", target: "platform_fees", details: "Updated marketplace fee from 10% to 8%", created_at: new Date(Date.now() - 90 * 60_000).toISOString() },
  { id: "seed-6", user_id: null, user_email: "devon@wccg1045fm.com", action: "content.approve", target: "productions", details: "Approved production PQ-1047", created_at: new Date(Date.now() - 120 * 60_000).toISOString() },
  { id: "seed-7", user_id: null, user_email: "admin@wccg1045fm.com", action: "content.reject", target: "hub_posts", details: "Rejected post for policy violation", created_at: new Date(Date.now() - 180 * 60_000).toISOString() },
  { id: "seed-8", user_id: null, user_email: "ladysoul@wccg1045fm.com", action: "content.create", target: "productions", details: "Submitted new production 'Evening Vibes Intro'", created_at: new Date(Date.now() - 240 * 60_000).toISOString() },
  { id: "seed-9", user_id: null, user_email: "admin@wccg1045fm.com", action: "user.verify", target: "profiles", details: "Vendor verified: Soul Food Kitchen", created_at: new Date(Date.now() - 360 * 60_000).toISOString() },
  { id: "seed-10", user_id: null, user_email: "system", action: "system.backup", target: "system", details: "Automated daily backup completed", created_at: new Date(Date.now() - 480 * 60_000).toISOString() },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getActionColor(action: string): string {
  if (action.includes("create") || action.includes("verify")) return "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/30";
  if (action.includes("update") || action.includes("role_change")) return "bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/30";
  if (action.includes("delete") || action.includes("reject")) return "bg-[#dc2626]/10 text-[#dc2626] border-[#dc2626]/30";
  if (action.includes("login") || action.includes("logout")) return "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/30";
  if (action.includes("approve")) return "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/30";
  if (action.includes("system")) return "bg-[#7401df]/10 text-[#7401df] border-[#7401df]/30";
  return "bg-muted text-muted-foreground border-border";
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AuditLogPage() {
  const { supabase } = useSupabase();
  const { user, isLoading: authLoading } = useAuth();

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingSeed, setUsingSeed] = useState(false);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Fetch audit log
  const fetchLog = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error || !data || data.length === 0) {
      setEntries(SEED_ENTRIES);
      setUsingSeed(true);
      if (error) console.error("Audit log query failed, showing seed data:", error);
    } else {
      setEntries(data);
      setUsingSeed(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchLog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Derive unique action types
  const actionTypes = useMemo(() => {
    const set = new Set(entries.map((e) => e.action));
    return Array.from(set).sort();
  }, [entries]);

  // Filter
  const filtered = useMemo(() => {
    let result = entries;

    if (actionFilter !== "all") {
      result = result.filter((e) => e.action === actionFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          (e.user_email ?? "").toLowerCase().includes(q) ||
          (e.action ?? "").toLowerCase().includes(q) ||
          (e.target ?? "").toLowerCase().includes(q) ||
          (e.details ?? "").toLowerCase().includes(q)
      );
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      result = result.filter((e) => new Date(e.created_at) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo + "T23:59:59");
      result = result.filter((e) => new Date(e.created_at) <= to);
    }

    return result;
  }, [entries, actionFilter, search, dateFrom, dateTo]);

  // Auth guard
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Shield className="h-12 w-12 text-[#dc2626]" />
        <h2 className="text-xl font-bold text-foreground">Sign In Required</h2>
        <p className="text-sm text-muted-foreground">
          You must be signed in as an admin to access this page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#dc2626]/10 border border-[#dc2626]/20">
            <ScrollText className="h-7 w-7 text-[#dc2626]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
            <p className="text-sm text-muted-foreground">
              Platform activity and change history
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchLog}
          disabled={loading}
          className="border-[#dc2626]/30 text-[#dc2626] hover:bg-[#dc2626]/10"
        >
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Seed data banner */}
      {usingSeed && (
        <div className="rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/5 px-4 py-3 text-sm text-[#f59e0b]">
          Showing sample audit entries. Live data will appear once the audit_log
          table is populated.
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Action type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {actionTypes.map((a) => (
              <SelectItem key={a} value={a} className="text-xs">
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-[140px]"
            title="From date"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-[140px]"
            title="To date"
          />
        </div>
      </div>

      {/* Log Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <ScrollText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No log entries found.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Target
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((entry) => (
                <tr
                  key={entry.id}
                  className="hover:bg-muted/20 transition-colors"
                >
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {formatTimestamp(entry.created_at)}
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-foreground whitespace-nowrap">
                    {entry.user_email || entry.user_id || "system"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${getActionColor(entry.action)}`}
                    >
                      {entry.action}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {entry.target || "-"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[300px] truncate">
                    {entry.details || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className="rounded-xl border border-border bg-card p-4 text-center">
        <p className="text-xs text-muted-foreground/60">
          Showing {filtered.length} of {entries.length} entries
          {usingSeed ? " (sample data)" : ""}
        </p>
      </div>
    </div>
  );
}
