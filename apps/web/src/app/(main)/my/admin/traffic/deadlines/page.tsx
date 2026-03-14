"use client";

import { useState, useEffect } from "react";
import {
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  FileText,
  Radio,
  DollarSign,
  Megaphone,
  Shield,
  CheckCircle,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { TabsNav } from "@/components/admin/tabs-nav";
import { loadOrSeed, persist, formatDate } from "@/lib/admin-storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Deadline {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  category: "FCC Filings" | "Contract Renewals" | "Campaign Starts" | "Production Due" | "Billing Cycles" | "License Renewals";
  status: "Upcoming" | "Due Today" | "Overdue" | "Completed";
  assignedTo: string;
  priority: "High" | "Medium" | "Low";
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

const SEED_DEADLINES: Deadline[] = [
  // FCC
  { id: "dl1", title: "Q1 Issues/Programs List", description: "File quarterly issues & programs list with FCC", dueDate: "2026-04-10", category: "FCC Filings", status: "Upcoming", assignedTo: "Devon Robinson", priority: "High" },
  { id: "dl2", title: "EAS Monthly Test Log", description: "Submit monthly EAS test documentation", dueDate: "2026-03-31", category: "FCC Filings", status: "Upcoming", assignedTo: "James Carter", priority: "Medium" },
  { id: "dl3", title: "Annual Ownership Report (323)", description: "FCC Form 323 annual ownership report", dueDate: "2026-11-01", category: "FCC Filings", status: "Upcoming", assignedTo: "Marcus Thompson", priority: "High" },
  // Contract Renewals
  { id: "dl4", title: "Cross Creek Mall Contract Renewal", description: "Q1 contract expires, renewal discussion needed", dueDate: "2026-03-15", category: "Contract Renewals", status: "Overdue", assignedTo: "Tanya Brooks", priority: "High" },
  { id: "dl5", title: "Fayetteville Kia Contract Renewal", description: "Auto-renew clause, but client wants restructure", dueDate: "2026-03-15", category: "Contract Renewals", status: "Overdue", assignedTo: "Angela Davis", priority: "High" },
  { id: "dl6", title: "Fort Bragg FCU Contract Renewal", description: "H1 contract renewal, renegotiate rates", dueDate: "2026-06-01", category: "Contract Renewals", status: "Upcoming", assignedTo: "Angela Davis", priority: "Medium" },
  // Campaign Starts
  { id: "dl7", title: "Lowe's Spring Garden Campaign Start", description: "New campaign materials due from client", dueDate: "2026-03-15", category: "Campaign Starts", status: "Due Today", assignedTo: "Sarah Mitchell", priority: "High" },
  { id: "dl8", title: "State Farm Campaign Launch", description: "New client, first spots begin airing", dueDate: "2026-04-01", category: "Campaign Starts", status: "Upcoming", assignedTo: "Sarah Mitchell", priority: "Medium" },
  { id: "dl9", title: "Fayetteville Tech Fall Campaign", description: "Enrollment campaign begins", dueDate: "2026-04-15", category: "Campaign Starts", status: "Upcoming", assignedTo: "Mike Johnson", priority: "Low" },
  // Production Due
  { id: "dl10", title: "Cape Fear Auto Summer Spot", description: "Production order PO-001 due", dueDate: "2026-03-20", category: "Production Due", status: "Upcoming", assignedTo: "Chris Morgan", priority: "High" },
  { id: "dl11", title: "Cross Creek Mall Easter Spot", description: "Rush production order PO-008", dueDate: "2026-03-22", category: "Production Due", status: "Upcoming", assignedTo: "Chris Morgan", priority: "High" },
  { id: "dl12", title: "Fort Bragg FCU Auto Loan Spot", description: "Production order PO-003 editing", dueDate: "2026-03-18", category: "Production Due", status: "Upcoming", assignedTo: "Chris Morgan", priority: "High" },
  // Billing Cycles
  { id: "dl13", title: "March Billing Close", description: "Finalize March invoices and send to clients", dueDate: "2026-04-05", category: "Billing Cycles", status: "Upcoming", assignedTo: "Sarah Mitchell", priority: "High" },
  { id: "dl14", title: "Q1 Revenue Report", description: "Compile quarterly revenue report for GM", dueDate: "2026-04-10", category: "Billing Cycles", status: "Upcoming", assignedTo: "Sarah Mitchell", priority: "Medium" },
  { id: "dl15", title: "February AR Follow-up", description: "Follow up on all outstanding February invoices", dueDate: "2026-03-15", category: "Billing Cycles", status: "Due Today", assignedTo: "Sarah Mitchell", priority: "High" },
  // License Renewals
  { id: "dl16", title: "ASCAP/BMI Music License Renewal", description: "Annual music licensing renewal", dueDate: "2026-06-30", category: "License Renewals", status: "Upcoming", assignedTo: "Marcus Thompson", priority: "Medium" },
  { id: "dl17", title: "FCC Broadcast License Renewal", description: "8-year license renewal filing", dueDate: "2027-06-01", category: "License Renewals", status: "Upcoming", assignedTo: "Marcus Thompson", priority: "Low" },
  { id: "dl18", title: "WideOrbit License Renewal", description: "Annual traffic system software license", dueDate: "2026-03-31", category: "License Renewals", status: "Upcoming", assignedTo: "Sarah Mitchell", priority: "Medium" },
];

const STORAGE_KEY = "wccg:traffic-deadlines";

const CAT_COLORS: Record<string, { dot: string; bg: string; text: string }> = {
  "FCC Filings": { dot: "bg-red-400", bg: "bg-red-500/10", text: "text-red-400" },
  "Contract Renewals": { dot: "bg-yellow-400", bg: "bg-yellow-500/10", text: "text-yellow-400" },
  "Campaign Starts": { dot: "bg-emerald-400", bg: "bg-emerald-500/10", text: "text-emerald-400" },
  "Production Due": { dot: "bg-blue-400", bg: "bg-blue-500/10", text: "text-blue-400" },
  "Billing Cycles": { dot: "bg-purple-400", bg: "bg-purple-500/10", text: "text-purple-400" },
  "License Renewals": { dot: "bg-orange-400", bg: "bg-orange-500/10", text: "text-orange-400" },
};

const CAT_ICONS: Record<string, typeof Clock> = {
  "FCC Filings": Shield,
  "Contract Renewals": FileText,
  "Campaign Starts": Megaphone,
  "Production Due": Radio,
  "Billing Cycles": DollarSign,
  "License Renewals": FileText,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DeadlineCalendarPage() {
  const [mounted, setMounted] = useState(false);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => new Date(2026, 2, 1)); // March 2026
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [filterCat, setFilterCat] = useState("all");

  useEffect(() => {
    setMounted(true);
    setDeadlines(loadOrSeed(STORAGE_KEY, SEED_DEADLINES));
  }, []);

  if (!mounted) {
    return <div className="p-6 space-y-6 animate-pulse"><div className="h-12 bg-muted rounded-xl w-1/3" /></div>;
  }

  const markComplete = (id: string) => {
    const updated = deadlines.map((d) => d.id === id ? { ...d, status: "Completed" as const } : d);
    setDeadlines(updated);
    persist(STORAGE_KEY, updated);
  };

  const today = new Date();
  const overdue = deadlines.filter((d) => d.status === "Overdue").length;
  const dueToday = deadlines.filter((d) => d.status === "Due Today").length;
  const upcoming7 = deadlines.filter((d) => {
    if (d.status === "Completed") return false;
    const due = new Date(d.dueDate);
    const diff = (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  }).length;
  const completed = deadlines.filter((d) => d.status === "Completed").length;

  // Calendar generation
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  // Get deadlines for a specific day
  const getDeadlinesForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return deadlines.filter((d) => d.dueDate === dateStr);
  };

  const changeMonth = (dir: number) => {
    setCurrentMonth(new Date(year, month + dir, 1));
  };

  // Filter for list view
  const filteredDeadlines = (filterCat === "all" ? deadlines : deadlines.filter((d) => d.category === filterCat))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const allCategories = [...new Set(deadlines.map((d) => d.category))];

  return (
    <div className="p-6 space-y-6">
      <PageHeader icon={Clock} title="Deadline Calendar" description="Master deadline calendar for FCC, contracts, billing and more" badge="Deadlines" badgeColor="bg-cyan-500/10 text-cyan-400 border-cyan-500/20" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Overdue" value={overdue} icon={AlertTriangle} color="text-red-400" bg="bg-red-500/10" />
        <StatCard label="Due Today" value={dueToday} icon={Clock} color="text-yellow-400" bg="bg-yellow-500/10" />
        <StatCard label="Next 7 Days" value={upcoming7} icon={Calendar} color="text-blue-400" bg="bg-blue-500/10" />
        <StatCard label="Completed" value={completed} icon={CheckCircle} color="text-emerald-400" bg="bg-emerald-500/10" />
      </div>

      {/* Overdue Alerts */}
      {overdue > 0 && (
        <div className="space-y-2">
          {deadlines.filter((d) => d.status === "Overdue").map((d) => (
            <div key={d.id} className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-3">
              <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{d.title}</p>
                <p className="text-xs text-muted-foreground">Due {formatDate(d.dueDate)} -- {d.assignedTo}</p>
              </div>
              <button onClick={() => markComplete(d.id)} className="px-3 py-1 text-xs rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                Complete
              </button>
            </div>
          ))}
        </div>
      )}

      {/* View toggle */}
      <div className="flex items-center gap-2">
        <button onClick={() => setView("calendar")} className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${view === "calendar" ? "border-[#74ddc7] bg-[#74ddc7]/10 text-[#74ddc7]" : "border-border text-muted-foreground hover:text-foreground"}`}>
          Calendar View
        </button>
        <button onClick={() => setView("list")} className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${view === "list" ? "border-[#74ddc7] bg-[#74ddc7]/10 text-[#74ddc7]" : "border-border text-muted-foreground hover:text-foreground"}`}>
          List View
        </button>
      </div>

      {/* Category legend */}
      <div className="flex items-center gap-4 flex-wrap">
        {allCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCat(filterCat === cat ? "all" : cat)}
            className={`flex items-center gap-1.5 text-xs transition-colors ${filterCat === cat ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
          >
            <div className={`h-2.5 w-2.5 rounded-full ${CAT_COLORS[cat]?.dot || "bg-gray-400"}`} />
            {cat}
          </button>
        ))}
        {filterCat !== "all" && (
          <button onClick={() => setFilterCat("all")} className="text-xs text-muted-foreground hover:text-foreground">Clear filter</button>
        )}
      </div>

      {view === "calendar" ? (
        /* Calendar View */
        <div>
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => changeMonth(-1)} className="h-8 w-8 flex items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h2 className="text-lg font-bold">{monthName}</h2>
            <button onClick={() => changeMonth(1)} className="h-8 w-8 flex items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-border">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, i) => {
                const dayDeadlines = day ? getDeadlinesForDay(day).filter((d) => filterCat === "all" || d.category === filterCat) : [];
                const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                return (
                  <div
                    key={i}
                    className={`min-h-[80px] border-b border-r border-border p-1.5 ${
                      day ? "hover:bg-muted/20" : "bg-muted/5"
                    } ${isToday ? "bg-[#74ddc7]/5" : ""}`}
                  >
                    {day && (
                      <>
                        <p className={`text-xs font-medium mb-1 ${isToday ? "text-[#74ddc7]" : "text-muted-foreground"}`}>{day}</p>
                        <div className="space-y-0.5">
                          {dayDeadlines.slice(0, 3).map((dl) => (
                            <button
                              key={dl.id}
                              onClick={() => markComplete(dl.id)}
                              className={`w-full text-left text-[9px] leading-tight px-1 py-0.5 rounded truncate ${CAT_COLORS[dl.category]?.bg || "bg-muted"} ${CAT_COLORS[dl.category]?.text || ""} ${dl.status === "Completed" ? "line-through opacity-50" : ""}`}
                              title={dl.title}
                            >
                              {dl.title}
                            </button>
                          ))}
                          {dayDeadlines.length > 3 && (
                            <p className="text-[9px] text-muted-foreground px-1">+{dayDeadlines.length - 3} more</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* List View */
        <div className="space-y-2">
          {filteredDeadlines.map((d) => {
            const colors = CAT_COLORS[d.category] || { dot: "bg-gray-400", bg: "bg-muted", text: "text-muted-foreground" };
            const Icon = CAT_ICONS[d.category] || Clock;
            const due = new Date(d.dueDate);
            const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return (
              <div key={d.id} className={`flex items-center gap-4 rounded-xl border bg-card p-4 transition-all hover:bg-muted/20 ${
                d.status === "Overdue" ? "border-red-500/30" : d.status === "Due Today" ? "border-yellow-500/30" : "border-border"
              } ${d.status === "Completed" ? "opacity-50" : ""}`}>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colors.bg}`}>
                  <Icon className={`h-5 w-5 ${colors.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${d.status === "Completed" ? "line-through" : ""}`}>{d.title}</p>
                  <p className="text-xs text-muted-foreground">{d.description}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground">{d.assignedTo}</span>
                    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                      <div className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
                      {d.category}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-xs font-medium ${d.status === "Overdue" ? "text-red-400" : d.status === "Due Today" ? "text-yellow-400" : "text-muted-foreground"}`}>
                    {formatDate(d.dueDate)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {d.status === "Completed" ? "Done" : diff < 0 ? `${Math.abs(diff)}d overdue` : diff === 0 ? "Today" : `${diff}d left`}
                  </p>
                </div>
                {d.status !== "Completed" && (
                  <button onClick={() => markComplete(d.id)} className="h-8 w-8 flex items-center justify-center rounded-lg border border-border hover:bg-emerald-500/10 hover:border-emerald-500/20 transition-colors shrink-0">
                    <CheckCircle className="h-4 w-4 text-muted-foreground hover:text-emerald-400" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
