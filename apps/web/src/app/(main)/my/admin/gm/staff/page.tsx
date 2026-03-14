"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Search,
  Mail,
  Phone,
  Calendar,
  Building2,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { DetailModal } from "@/components/admin/detail-modal";
import { SEED_STAFF, type StaffMember } from "@/lib/staff";
import { formatDate } from "@/lib/admin-storage";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEPARTMENTS = ["all", "management", "programming", "operations", "sales", "engineering", "promotions", "traffic"] as const;

const DEPT_LABELS: Record<string, string> = {
  all: "All Departments",
  management: "Management",
  programming: "Programming",
  operations: "Operations",
  sales: "Sales",
  engineering: "Engineering",
  promotions: "Promotions",
  traffic: "Traffic",
};

const DEPT_COLORS: Record<string, string> = {
  management: "bg-[#7401df]/10 text-[#7401df] border-[#7401df]/20",
  programming: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  operations: "bg-[#74ddc7]/10 text-[#74ddc7] border-[#74ddc7]/20",
  sales: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  engineering: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  promotions: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  traffic: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
};

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StaffDirectoryPage() {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [selected, setSelected] = useState<StaffMember | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const staff = SEED_STAFF;
  const filtered = staff.filter((s) => {
    if (deptFilter !== "all" && s.department !== deptFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
    }
    return true;
  });

  const byDept = DEPARTMENTS.slice(1).reduce((acc, d) => {
    acc[d] = staff.filter((s) => s.department === d).length;
    return acc;
  }, {} as Record<string, number>);

  const activeCount = staff.filter((s) => s.status === "active").length;
  const remoteCount = staff.filter((s) => s.status === "remote").length;
  const leaveCount = staff.filter((s) => s.status === "on-leave").length;

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        icon={Users}
        title="Staff Directory"
        description="Complete WCCG 104.5 FM team directory"
        iconColor="text-blue-400"
        iconBg="bg-blue-500/10 border-blue-500/20"
        badge={`${staff.length} members`}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Active" value={activeCount} icon={Users} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard label="Remote" value={remoteCount} icon={Building2} color="text-blue-400" bg="bg-blue-500/10" />
        <StatCard label="On Leave" value={leaveCount} icon={Calendar} color="text-yellow-400" bg="bg-yellow-500/10" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search staff..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
          />
        </div>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/40"
        >
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>{DEPT_LABELS[d]} {d !== "all" ? `(${byDept[d] || 0})` : ""}</option>
          ))}
        </select>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((member) => (
          <button
            key={member.id}
            type="button"
            onClick={() => setSelected(member)}
            className="text-left rounded-xl border border-border bg-card p-5 hover:border-input hover:shadow-lg hover:shadow-black/10 transition-all"
          >
            <div className="flex items-center gap-4 mb-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold ${
                DEPT_COLORS[member.department] || "bg-muted text-muted-foreground border-border"
              }`}>
                {getInitials(member.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{member.name}</p>
                <p className="text-xs text-muted-foreground truncate">{member.role}</p>
              </div>
              <StatusBadge status={member.status} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate">{member.email}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Phone className="h-3 w-3 shrink-0" />
                <span>{member.phone} ext. {member.extension}</span>
              </div>
            </div>
            <div className="mt-3">
              <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                DEPT_COLORS[member.department] || "bg-muted text-muted-foreground border-border"
              }`}>
                {member.department}
              </span>
            </div>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No staff members match your search.
        </div>
      )}

      {/* Detail Modal */}
      <DetailModal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ""}
        subtitle={selected?.role}
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className={`flex h-20 w-20 items-center justify-center rounded-full text-xl font-bold ${
                DEPT_COLORS[selected.department] || "bg-muted text-muted-foreground border-border"
              }`}>
                {getInitials(selected.name)}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Department</p>
                <p className="text-sm font-medium text-foreground capitalize">{selected.department}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <StatusBadge status={selected.status} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm text-foreground">{selected.email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-sm text-foreground">{selected.phone}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Extension</p>
                <p className="text-sm text-foreground">{selected.extension}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Hire Date</p>
                <p className="text-sm text-foreground">{formatDate(selected.hireDate)}</p>
              </div>
            </div>
          </div>
        )}
      </DetailModal>
    </div>
  );
}
