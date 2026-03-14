"use client";

const STATUS_STYLES: Record<string, string> = {
  // General
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  completed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  draft: "bg-foreground/[0.06] text-muted-foreground border-border",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
  overdue: "bg-red-500/10 text-red-400 border-red-500/20",
  // Traffic
  scheduled: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  aired: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "make-good": "bg-orange-500/10 text-orange-400 border-orange-500/20",
  // Sales
  proposal: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  negotiation: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  closed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  lost: "bg-red-500/10 text-red-400 border-red-500/20",
  // Operations
  operational: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  warning: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  critical: "bg-red-500/10 text-red-400 border-red-500/20",
  maintenance: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  // Invoice
  sent: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  // Compliance
  compliant: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "non-compliant": "bg-red-500/10 text-red-400 border-red-500/20",
  // GM
  "on-track": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "at-risk": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  "behind": "bg-red-500/10 text-red-400 border-red-500/20",
  // Generic
  open: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  resolved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "in-progress": "bg-[#74ddc7]/10 text-[#74ddc7] border-[#74ddc7]/20",
  new: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const key = status.toLowerCase();
  const style = STATUS_STYLES[key] || "bg-foreground/[0.06] text-muted-foreground border-border";
  return (
    <span
      className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${style} ${className}`}
    >
      {status}
    </span>
  );
}
