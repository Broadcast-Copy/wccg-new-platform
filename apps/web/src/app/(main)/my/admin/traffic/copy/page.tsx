"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { DataTable, type Column } from "@/components/admin/data-table";
import { DetailModal } from "@/components/admin/detail-modal";
import { loadOrSeed, persist, genId, formatDate } from "@/lib/admin-storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AdCopy {
  id: string;
  client: string;
  campaign: string;
  title: string;
  format: ":30" | ":60" | ":15";
  version: number;
  status: "Draft" | "Approved" | "Active" | "Expired";
  startDate: string;
  endDate: string;
  lastModified: string;
  scriptText: string;
  talent: string;
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

const SEED_COPY: AdCopy[] = [
  { id: "cp1", client: "Cape Fear Auto Group", campaign: "Spring Clearance 2026", title: "Spring Clearance - Trucks", format: ":30", version: 3, status: "Active", startDate: "2026-03-01", endDate: "2026-03-31", lastModified: "2026-03-10T14:30:00Z", scriptText: "Cape Fear Auto Group Spring Clearance is happening NOW! Save up to $5,000 on select trucks...", talent: "DJ Smooth" },
  { id: "cp2", client: "Cape Fear Auto Group", campaign: "Spring Clearance 2026", title: "Spring Clearance - SUVs", format: ":30", version: 2, status: "Active", startDate: "2026-03-01", endDate: "2026-03-31", lastModified: "2026-03-08T10:00:00Z", scriptText: "Looking for a new SUV? Cape Fear Auto Group has the best selection in Fayetteville...", talent: "Lady Soul" },
  { id: "cp3", client: "Fort Bragg FCU", campaign: "Mortgage Refi Q1", title: "Mortgage Refinance - Rate Drop", format: ":60", version: 1, status: "Active", startDate: "2026-01-15", endDate: "2026-04-15", lastModified: "2026-01-12T09:00:00Z", scriptText: "Fort Bragg Federal Credit Union is offering historically low mortgage refinance rates...", talent: "Marcus Thompson" },
  { id: "cp4", client: "Cross Creek Mall", campaign: "Spring Fashion", title: "Easter Weekend Shopping", format: ":30", version: 1, status: "Draft", startDate: "2026-03-28", endDate: "2026-04-05", lastModified: "2026-03-12T16:45:00Z", scriptText: "This Easter weekend, Cross Creek Mall invites you to discover the latest spring fashions...", talent: "Lady Soul" },
  { id: "cp5", client: "Fayetteville Kia", campaign: "Employee Pricing Event", title: "Employee Pricing - March", format: ":30", version: 4, status: "Active", startDate: "2026-03-01", endDate: "2026-03-31", lastModified: "2026-03-05T11:20:00Z", scriptText: "Fayetteville Kia Employee Pricing Event! Everyone gets employee pricing on every new Kia in stock...", talent: "DJ Smooth" },
  { id: "cp6", client: "Lowe's Home Improvement", campaign: "Spring Garden", title: "Spring Garden Sale", format: ":30", version: 2, status: "Approved", startDate: "2026-03-15", endDate: "2026-04-15", lastModified: "2026-03-11T08:00:00Z", scriptText: "Lowe's Spring Garden Sale is here! Save 20% on all mulch, soil, and plants...", talent: "Chris Morgan" },
  { id: "cp7", client: "Carolina Ale House", campaign: "Lunch Specials", title: "Lunch Combos $9.99", format: ":15", version: 1, status: "Active", startDate: "2026-02-01", endDate: "2026-05-31", lastModified: "2026-01-28T14:00:00Z", scriptText: "Carolina Ale House lunch combos starting at just $9.99! Monday through Friday...", talent: "DJ Quick" },
  { id: "cp8", client: "NC Lottery", campaign: "Powerball Spring", title: "Powerball Jackpot Alert", format: ":30", version: 1, status: "Active", startDate: "2026-03-10", endDate: "2026-03-17", lastModified: "2026-03-10T06:00:00Z", scriptText: "The Powerball jackpot is now over $400 million! Get your ticket today at any NC Lottery retailer...", talent: "DJ Smooth" },
  { id: "cp9", client: "Crown Complex", campaign: "Gospel Concert Series", title: "Kirk Franklin Live", format: ":60", version: 2, status: "Active", startDate: "2026-03-01", endDate: "2026-04-05", lastModified: "2026-02-28T10:30:00Z", scriptText: "Crown Complex presents Kirk Franklin LIVE on April 5th! Don't miss this unforgettable evening of gospel music...", talent: "Lady Soul" },
  { id: "cp10", client: "McDonald's Fayetteville", campaign: "McRib Return", title: "McRib Limited Time", format: ":30", version: 1, status: "Expired", startDate: "2026-01-15", endDate: "2026-02-28", lastModified: "2026-01-10T12:00:00Z", scriptText: "The McRib is BACK at McDonald's for a limited time! Hurry in to your Fayetteville McDonald's...", talent: "DJ Quick" },
  { id: "cp11", client: "State Farm - J. Williams", campaign: "Auto Insurance", title: "Like a Good Neighbor - Local", format: ":30", version: 1, status: "Draft", startDate: "2026-04-01", endDate: "2026-06-30", lastModified: "2026-03-13T15:00:00Z", scriptText: "When you need auto insurance, call your neighbor — Justin Williams, State Farm agent...", talent: "Marcus Thompson" },
  { id: "cp12", client: "Fayetteville Tech", campaign: "Fall 2026 Enrollment", title: "Register Now - Fall 2026", format: ":30", version: 1, status: "Draft", startDate: "2026-04-15", endDate: "2026-08-15", lastModified: "2026-03-14T09:00:00Z", scriptText: "Fayetteville Technical Community College — your future starts here! Register now for Fall 2026...", talent: "Lady Soul" },
];

const STORAGE_KEY = "wccg:traffic-copy";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CopyManagementPage() {
  const [mounted, setMounted] = useState(false);
  const [copies, setCopies] = useState<AdCopy[]>([]);
  const [selected, setSelected] = useState<AdCopy | null>(null);

  useEffect(() => {
    setMounted(true);
    setCopies(loadOrSeed(STORAGE_KEY, SEED_COPY));
  }, []);

  if (!mounted) {
    return <div className="p-6 space-y-6 animate-pulse"><div className="h-12 bg-muted rounded-xl w-1/3" /></div>;
  }

  const updateStatus = (id: string, newStatus: AdCopy["status"]) => {
    const updated = copies.map((c) => c.id === id ? { ...c, status: newStatus, lastModified: new Date().toISOString() } : c);
    setCopies(updated);
    persist(STORAGE_KEY, updated);
    if (selected?.id === id) setSelected({ ...selected, status: newStatus });
  };

  const active = copies.filter((c) => c.status === "Active").length;
  const drafts = copies.filter((c) => c.status === "Draft").length;
  const approved = copies.filter((c) => c.status === "Approved").length;
  const expired = copies.filter((c) => c.status === "Expired").length;

  const columns: Column<AdCopy>[] = [
    { key: "id", label: "Copy ID", render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.id.toUpperCase()}</span> },
    { key: "client", label: "Client", sortable: true, sortKey: (r) => r.client, render: (r) => <span className="font-medium text-sm">{r.client}</span> },
    { key: "campaign", label: "Campaign", hideOnMobile: true, render: (r) => <span className="text-sm text-muted-foreground">{r.campaign}</span> },
    { key: "title", label: "Title", sortable: true, sortKey: (r) => r.title, render: (r) => <span className="text-sm">{r.title}</span> },
    { key: "format", label: "Format", align: "center", render: (r) => <span className="font-mono text-xs">{r.format}</span> },
    { key: "version", label: "Ver", align: "center", hideOnMobile: true, render: (r) => <span className="text-xs">v{r.version}</span> },
    { key: "status", label: "Status", sortable: true, sortKey: (r) => r.status, render: (r) => <StatusBadge status={r.status} /> },
    { key: "dates", label: "Run Dates", hideOnMobile: true, render: (r) => <span className="text-xs text-muted-foreground">{formatDate(r.startDate)} - {formatDate(r.endDate)}</span> },
    { key: "modified", label: "Modified", hideOnMobile: true, sortable: true, sortKey: (r) => r.lastModified, render: (r) => <span className="text-xs text-muted-foreground">{formatDate(r.lastModified)}</span> },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader icon={FileText} title="Copy Management" description="Ad copy tracking, approvals and version control" badge="Copy" badgeColor="bg-blue-500/10 text-blue-400 border-blue-500/20" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Copy" value={active} icon={CheckCircle} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard label="Drafts" value={drafts} icon={Edit} color="text-yellow-400" bg="bg-yellow-500/10" />
        <StatCard label="Approved" value={approved} icon={Clock} color="text-blue-400" bg="bg-blue-500/10" />
        <StatCard label="Expired" value={expired} icon={XCircle} color="text-red-400" bg="bg-red-500/10" />
      </div>

      <DataTable
        columns={columns}
        data={copies}
        keyField="id"
        searchable
        searchPlaceholder="Search client or title..."
        searchFilter={(r, q) => r.client.toLowerCase().includes(q) || r.title.toLowerCase().includes(q) || r.campaign.toLowerCase().includes(q)}
        onRowClick={(r) => setSelected(r)}
      />

      {/* Detail Modal */}
      <DetailModal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title || ""}
        subtitle={`${selected?.client} — ${selected?.campaign}`}
        maxWidth="max-w-2xl"
        actions={
          selected && (
            <>
              {selected.status === "Draft" && (
                <button onClick={() => updateStatus(selected.id, "Approved")} className="px-4 py-2 text-sm rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors">
                  Approve Copy
                </button>
              )}
              {(selected.status === "Approved" || selected.status === "Active") && (
                <button onClick={() => updateStatus(selected.id, "Expired")} className="px-4 py-2 text-sm rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                  Mark Expired
                </button>
              )}
              {selected.status === "Approved" && (
                <button onClick={() => updateStatus(selected.id, "Active")} className="px-4 py-2 text-sm rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                  Activate
                </button>
              )}
            </>
          )
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-muted-foreground">Copy ID</span><p className="text-sm font-mono">{selected.id.toUpperCase()}</p></div>
              <div><span className="text-xs text-muted-foreground">Format</span><p className="text-sm">{selected.format}</p></div>
              <div><span className="text-xs text-muted-foreground">Version</span><p className="text-sm">v{selected.version}</p></div>
              <div><span className="text-xs text-muted-foreground">Status</span><p className="mt-0.5"><StatusBadge status={selected.status} /></p></div>
              <div><span className="text-xs text-muted-foreground">Start Date</span><p className="text-sm">{formatDate(selected.startDate)}</p></div>
              <div><span className="text-xs text-muted-foreground">End Date</span><p className="text-sm">{formatDate(selected.endDate)}</p></div>
              <div><span className="text-xs text-muted-foreground">Talent</span><p className="text-sm">{selected.talent}</p></div>
              <div><span className="text-xs text-muted-foreground">Last Modified</span><p className="text-sm">{formatDate(selected.lastModified)}</p></div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Script</span>
              <div className="mt-1 rounded-lg border border-border bg-muted/20 p-3 text-sm leading-relaxed">
                {selected.scriptText}
              </div>
            </div>
          </div>
        )}
      </DetailModal>
    </div>
  );
}
