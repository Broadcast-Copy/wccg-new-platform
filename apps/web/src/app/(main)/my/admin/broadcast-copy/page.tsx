"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Rocket,
  Loader2,
  RefreshCw,
  Mail,
  MapPin,
  Radio,
  Building2,
  ShieldAlert,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";
import { AirSuiteFleet } from "./airsuite-fleet";

// ---------------------------------------------------------------------------
// Types — statuses mirror the bc_leads_status_valid CHECK constraint (mig 094)
// ---------------------------------------------------------------------------

const LEAD_STATUSES = ["new", "contacted", "qualified", "won", "lost"] as const;
type LeadStatus = (typeof LEAD_STATUSES)[number];

/** Open (still-workable) pipeline — excludes closed won/lost. */
const OPEN_STATUSES: readonly LeadStatus[] = ["new", "contacted", "qualified"];

/** Base Broadcast tier — keep in sync with apps/marketing PLANS. */
const PRICE_PER_STATION = 49.99;

interface Lead {
  id: string;
  created_at: string;
  name: string | null;
  email: string;
  organization: string | null;
  call_sign: string | null;
  band: string | null;
  station_count: number | null;
  market: string | null;
  message: string | null;
  source: string | null;
  status: LeadStatus;
}

const STATUS_STYLE: Record<LeadStatus, string> = {
  new: "bg-[#7401df]/15 text-[#a855f7] border-[#7401df]/40",
  contacted: "bg-[#3b82f6]/15 text-[#60a5fa] border-[#3b82f6]/40",
  qualified: "bg-[#f59e0b]/15 text-[#fbbf24] border-[#f59e0b]/40",
  won: "bg-[#10b981]/15 text-[#34d399] border-[#10b981]/40",
  lost: "bg-muted text-muted-foreground border-border",
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** A lead's monthly value: one station minimum, at the Broadcast tier rate. */
function mrrOf(lead: Lead): number {
  return Math.max(1, lead.station_count ?? 1) * PRICE_PER_STATION;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BroadcastCopyLeadsPage() {
  const { supabase } = useSupabase();
  const { user, isLoading: authLoading } = useAuth();

  const [rows, setRows] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);

  const fetchLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bc_leads")
      .select(
        "id, created_at, name, email, organization, call_sign, band, station_count, market, message, source, status"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch Broadcast Copy leads:", error);
      toast.error("Failed to load leads");
      setRows([]);
    } else {
      setRows((data ?? []) as Lead[]);
      // RLS gates SELECT behind is_platform_admin() (super_admin), which is
      // stricter than this route's admin/management gate. An empty result for
      // a non-platform-admin is a permission signal, not an empty pipeline.
      setDenied((data ?? []).length === 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const setStatus = async (lead: Lead, status: LeadStatus) => {
    setActing(lead.id);
    const { error } = await supabase
      .from("bc_leads")
      .update({ status })
      .eq("id", lead.id);

    if (error) {
      console.error("Failed to update lead:", error);
      toast.error("Couldn't update that lead");
    } else {
      setRows((prev) =>
        prev.map((r) => (r.id === lead.id ? { ...r, status } : r))
      );
      toast.success(`Marked ${lead.email} as ${status}`);
    }
    setActing(null);
  };

  const openLeads = rows.filter((r) => OPEN_STATUSES.includes(r.status));
  const wonLeads = rows.filter((r) => r.status === "won");
  const pipelineValue = openLeads.reduce((sum, r) => sum + mrrOf(r), 0);
  const wonValue = wonLeads.reduce((sum, r) => sum + mrrOf(r), 0);

  const stats = [
    { label: "Total leads", value: String(rows.length) },
    {
      label: "New",
      value: String(rows.filter((r) => r.status === "new").length),
    },
    { label: "Open pipeline / mo", value: money.format(pipelineValue) },
    { label: "Won MRR", value: money.format(wonValue) },
  ];

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-[#7401df] to-[#4c1d95] p-2.5">
            <Rocket className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Broadcast Copy — Pipeline</h1>
            <p className="text-sm text-muted-foreground">
              Early-access requests from broadcastcopy.ai
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLeads}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {rows.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl border bg-card p-4">
              <p className="text-xs tracking-wide text-muted-foreground uppercase">
                {stat.label}
              </p>
              <p className="mt-1 text-2xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      <AirSuiteFleet />

      {rows.length === 0 && (
        <div className="mt-8 rounded-xl border bg-card p-10 text-center">
          {denied ? (
            <>
              <ShieldAlert className="mx-auto h-9 w-9 text-[#f59e0b]" />
              <h2 className="mt-4 text-lg font-semibold">No leads visible</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Either nobody has requested early access yet, or your account
                isn&rsquo;t a <strong>platform admin</strong>. Reading{" "}
                <code className="rounded bg-muted px-1 py-0.5">bc_leads</code> is
                gated by <code className="rounded bg-muted px-1 py-0.5">
                  is_platform_admin()
                </code>{" "}
                (super_admin) in the database, which is stricter than access to
                this console.
              </p>
            </>
          ) : (
            <>
              <Inbox className="mx-auto h-9 w-9 text-muted-foreground" />
              <h2 className="mt-4 text-lg font-semibold">No leads yet</h2>
            </>
          )}
        </div>
      )}

      <div className="mt-6 space-y-3">
        {rows.map((lead) => (
          <article key={lead.id} className="rounded-xl border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">
                    {lead.name?.trim() || lead.organization?.trim() || lead.email}
                  </h3>
                  <Badge
                    variant="outline"
                    className={STATUS_STYLE[lead.status]}
                  >
                    {lead.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <a
                    href={`mailto:${lead.email}`}
                    className="inline-flex items-center gap-1.5 hover:text-foreground"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {lead.email}
                  </a>
                  {lead.organization && (
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5" />
                      {lead.organization}
                    </span>
                  )}
                  {(lead.call_sign || lead.band) && (
                    <span className="inline-flex items-center gap-1.5">
                      <Radio className="h-3.5 w-3.5" />
                      {[lead.call_sign, lead.band].filter(Boolean).join(" · ")}
                    </span>
                  )}
                  {lead.market && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {lead.market}
                    </span>
                  )}
                </div>

                {lead.message && (
                  <p className="mt-3 border-l-2 border-border pl-3 text-sm text-muted-foreground italic">
                    {lead.message}
                  </p>
                )}
              </div>

              <div className="text-right">
                <p className="text-lg font-bold">{money.format(mrrOf(lead))}</p>
                <p className="text-xs text-muted-foreground">
                  {Math.max(1, lead.station_count ?? 1)} station
                  {Math.max(1, lead.station_count ?? 1) === 1 ? "" : "s"} / mo
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 border-t pt-3">
              {LEAD_STATUSES.filter((s) => s !== lead.status).map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant="outline"
                  disabled={acting === lead.id}
                  onClick={() => setStatus(lead, status)}
                >
                  {acting === lead.id ? (
                    <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  ) : null}
                  Mark {status}
                </Button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
