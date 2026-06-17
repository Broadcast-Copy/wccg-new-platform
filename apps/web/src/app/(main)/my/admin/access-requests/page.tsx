"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  UserCheck,
  Loader2,
  RefreshCw,
  Check,
  X,
  Mic,
  Store,
  Building2,
  Inbox,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PendingProfile {
  id: string;
  display_name: string | null;
  email: string | null;
  requested_role: string | null;
  creator_type: string | null;
  artist_name: string | null;
  employee_code: string | null;
  created_at: string;
}

const ROLE_META: Record<
  string,
  { label: string; icon: LucideIcon; color: string }
> = {
  creator: { label: "Creator", icon: Mic, color: "#7401df" },
  vendor: { label: "Vendor", icon: Store, color: "#f59e0b" },
  employee: { label: "Employee", icon: Building2, color: "#dc2626" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AccessRequestsPage() {
  const { supabase } = useSupabase();
  const { user, isLoading: authLoading } = useAuth();

  const [rows, setRows] = useState<PendingProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const fetchPending = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, display_name, email, requested_role, creator_type, artist_name, employee_code, created_at"
      )
      .eq("access_request_status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch access requests:", error);
      toast.error("Failed to load access requests");
      setRows([]);
    } else {
      setRows(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Approve: grant the matching access flag + mark approved. The user gains
  // the role on their next role-resolve (RLS still enforces everything).
  const approve = async (p: PendingProfile) => {
    setActing(p.id);
    const patch: Record<string, unknown> = { access_request_status: "approved" };
    if (p.requested_role === "creator") {
      patch.has_creator_access = true;
    } else if (p.requested_role === "vendor") {
      patch.has_vendor_access = true;
      patch.vendor_verified = true;
      patch.vendor_application_status = "approved";
    } else if (p.requested_role === "employee") {
      patch.is_internal = true;
    }

    const { error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", p.id);

    if (error) {
      toast.error(`Approve failed: ${error.message}`);
    } else {
      setRows((prev) => prev.filter((r) => r.id !== p.id));
      const label = ROLE_META[p.requested_role ?? ""]?.label ?? p.requested_role;
      toast.success(`${p.display_name || "User"} approved as ${label}`);
    }
    setActing(null);
  };

  const deny = async (p: PendingProfile) => {
    setActing(p.id);
    const { error } = await supabase
      .from("profiles")
      .update({ access_request_status: "denied" })
      .eq("id", p.id);

    if (error) {
      toast.error(`Deny failed: ${error.message}`);
    } else {
      setRows((prev) => prev.filter((r) => r.id !== p.id));
      toast.success(`${p.display_name || "User"}'s request denied`);
    }
    setActing(null);
  };

  const initials = (name: string | null, email: string | null) => {
    if (name) {
      return name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return (email ?? "?")[0].toUpperCase();
  };

  // Auth guard (the /my/admin layout already gates by role; this is defensive)
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7401df]/10 border border-[#7401df]/20">
            <UserCheck className="h-7 w-7 text-[#7401df]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Access Requests
            </h1>
            <p className="text-sm text-muted-foreground">
              Approve or deny creator, vendor &amp; employee access requests
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchPending}
          disabled={loading}
          className="border-[#7401df]/30 text-[#7401df] hover:bg-[#7401df]/10"
        >
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Count */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          Pending Requests
        </p>
        <p className="mt-1 text-2xl font-bold text-[#7401df]">{rows.length}</p>
      </div>

      {/* Queue */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16">
          <Inbox className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No pending access requests. You&apos;re all caught up.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
          {rows.map((p) => {
            const meta = ROLE_META[p.requested_role ?? ""] ?? {
              label: p.requested_role ?? "Unknown",
              icon: UserCheck,
              color: "#64748b",
            };
            const RoleIcon = meta.icon;
            const detail =
              p.requested_role === "creator"
                ? [p.artist_name, p.creator_type].filter(Boolean).join(" · ")
                : p.requested_role === "employee"
                  ? p.employee_code
                    ? `Code: ${p.employee_code}`
                    : null
                  : null;
            return (
              <div
                key={p.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-4 hover:bg-muted/20 transition-colors"
              >
                {/* Avatar */}
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold text-sm"
                  style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}
                >
                  {initials(p.display_name, p.email)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {p.display_name || "Unnamed User"}
                    </p>
                    <Badge
                      variant="outline"
                      className="text-[10px]"
                      style={{
                        borderColor: `${meta.color}40`,
                        color: meta.color,
                      }}
                    >
                      <RoleIcon className="h-3 w-3 mr-1" />
                      {meta.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {p.email || p.id}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    {detail ? `${detail} · ` : ""}Requested{" "}
                    {new Date(p.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => approve(p)}
                    disabled={acting === p.id}
                    className="bg-[#22c55e] hover:bg-[#16a34a] text-white"
                  >
                    {acting === p.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deny(p)}
                    disabled={acting === p.id}
                    className="border-[#dc2626]/30 text-[#dc2626] hover:bg-[#dc2626]/10"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Deny
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-4 text-center">
        <p className="text-xs text-muted-foreground/60">
          Approving grants the matching access (creator / vendor / staff). All
          access is also enforced server-side by row-level security.
        </p>
      </div>
    </div>
  );
}
