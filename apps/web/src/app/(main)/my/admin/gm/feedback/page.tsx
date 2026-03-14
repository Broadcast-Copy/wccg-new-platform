"use client";

import { useState, useEffect } from "react";
import {
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Phone,
  Mail,
  Share2,
  Smartphone,
  Search,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { DataTable, type Column } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { DetailModal } from "@/components/admin/detail-modal";
import { TabsNav } from "@/components/admin/tabs-nav";
import { loadOrSeed, persist, formatDate } from "@/lib/admin-storage";

// ---------------------------------------------------------------------------
// Types & Seed
// ---------------------------------------------------------------------------

type Channel = "Phone" | "Email" | "Social" | "App";
type Sentiment = "Positive" | "Neutral" | "Negative";
type FeedbackCategory = "Programming" | "Contests" | "Events" | "Technical" | "General";
type ResolutionStatus = "Open" | "In Progress" | "Resolved";

interface Feedback {
  id: string;
  date: string;
  listenerName: string;
  channel: Channel;
  sentiment: Sentiment;
  category: FeedbackCategory;
  summary: string;
  fullText: string;
  resolution: ResolutionStatus;
  resolvedBy?: string;
}

const SEED_FEEDBACK: Feedback[] = [
  { id: "fb1", date: "2026-03-14", listenerName: "Tamika Johnson", channel: "Phone", sentiment: "Positive", category: "Programming", summary: "Loves the new Sunday Gospel Hour format", fullText: "Called in to say the new Sunday Gospel Hour format is amazing. She listens every week and has told all her friends at church. Wants to know if we can extend it by 30 minutes.", resolution: "Resolved", resolvedBy: "Keisha Williams" },
  { id: "fb2", date: "2026-03-13", listenerName: "Robert Williams", channel: "Email", sentiment: "Negative", category: "Technical", summary: "Stream keeps buffering on mobile", fullText: "Wrote in complaining about constant buffering on the mobile stream. Has been happening for about a week. He uses an Android phone on T-Mobile. Says he can listen to other stations fine.", resolution: "In Progress", resolvedBy: "James Carter" },
  { id: "fb3", date: "2026-03-13", listenerName: "Crystal Davis", channel: "Social", sentiment: "Positive", category: "Contests", summary: "Won concert tickets, great experience", fullText: "Posted on Instagram about winning Usher concert tickets from our morning show giveaway. Tagged the station and DJ Smooth. Post got 340 likes and 52 comments. Great organic engagement.", resolution: "Resolved" },
  { id: "fb4", date: "2026-03-12", listenerName: "James Mitchell", channel: "App", sentiment: "Neutral", category: "General", summary: "Requested more local news coverage", fullText: "Used the app feedback form to request more local Fayetteville news coverage, especially about city council decisions and school board meetings. Said we used to cover those more.", resolution: "Open" },
  { id: "fb5", date: "2026-03-12", listenerName: "Patricia Brown", channel: "Phone", sentiment: "Positive", category: "Events", summary: "Praise for Spring Community Fair booth", fullText: "Called to say how much she enjoyed meeting the WCCG team at the Spring Community Fair. Said Brandon and Lady Soul were very personable. Her kids loved the prizes.", resolution: "Resolved" },
  { id: "fb6", date: "2026-03-11", listenerName: "Marcus Green", channel: "Email", sentiment: "Negative", category: "Programming", summary: "Too many commercial breaks during morning show", fullText: "Emailed to complain about the frequency of commercial breaks during the 7-9am block. Says he switches to WZFX during breaks and sometimes doesn't switch back. Wants us to consider fewer but longer breaks.", resolution: "Open" },
  { id: "fb7", date: "2026-03-11", listenerName: "Denise Jackson", channel: "Social", sentiment: "Positive", category: "Programming", summary: "Old School Lunch Mix is her daily highlight", fullText: "Twitter post: 'The @WCCG1045 Old School Lunch Mix with Lady Soul is the best hour of my workday! Keep playing those classics!' Got 89 retweets.", resolution: "Resolved" },
  { id: "fb8", date: "2026-03-10", listenerName: "Anthony Harris", channel: "Phone", sentiment: "Negative", category: "Technical", summary: "FM signal weak in Spring Lake area", fullText: "Called to report poor signal reception in Spring Lake, especially near Manchester Rd. Says the signal fades in and out. This is a known coverage gap we've been monitoring.", resolution: "In Progress", resolvedBy: "James Carter" },
  { id: "fb9", date: "2026-03-10", listenerName: "Sandra Coleman", channel: "App", sentiment: "Positive", category: "Contests", summary: "App contest entry process is smooth", fullText: "Left app feedback saying the new contest entry feature works great. She entered 3 contests this week with no issues. Appreciates not having to call in.", resolution: "Resolved" },
  { id: "fb10", date: "2026-03-09", listenerName: "Derek Thompson", channel: "Email", sentiment: "Neutral", category: "Events", summary: "Suggestion for Juneteenth event partnership", fullText: "Emailed suggesting WCCG partner with the Fayetteville Juneteenth Committee for the upcoming celebration. Offered to connect us with the organizers. Provided contact info.", resolution: "Open" },
];

const STORAGE_KEY = "wccg:gm:feedback";

const CHANNEL_ICONS: Record<Channel, typeof Phone> = {
  Phone: Phone,
  Email: Mail,
  Social: Share2,
  App: Smartphone,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [sentimentFilter, setSentimentFilter] = useState("All");
  const [selected, setSelected] = useState<Feedback | null>(null);

  useEffect(() => {
    setFeedback(loadOrSeed(STORAGE_KEY, SEED_FEEDBACK));
  }, []);

  const filtered = sentimentFilter === "All" ? feedback : feedback.filter((f) => f.sentiment === sentimentFilter);

  const positive = feedback.filter((f) => f.sentiment === "Positive").length;
  const neutral = feedback.filter((f) => f.sentiment === "Neutral").length;
  const negative = feedback.filter((f) => f.sentiment === "Negative").length;
  const openCount = feedback.filter((f) => f.resolution === "Open").length;

  const columns: Column<Feedback>[] = [
    { key: "date", label: "Date", sortable: true, sortKey: (r) => r.date, render: (r) => <span className="text-xs text-muted-foreground">{formatDate(r.date)}</span> },
    { key: "name", label: "Listener", render: (r) => <span className="font-medium text-foreground">{r.listenerName}</span> },
    { key: "channel", label: "Channel", render: (r) => {
      const Icon = CHANNEL_ICONS[r.channel];
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon className="h-3 w-3" /> {r.channel}
        </span>
      );
    }},
    { key: "sentiment", label: "Sentiment", render: (r) => (
      <span className={`inline-flex items-center gap-1 text-xs font-medium ${
        r.sentiment === "Positive" ? "text-emerald-400" : r.sentiment === "Negative" ? "text-red-400" : "text-yellow-400"
      }`}>
        {r.sentiment === "Positive" ? <ThumbsUp className="h-3 w-3" /> : r.sentiment === "Negative" ? <ThumbsDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
        {r.sentiment}
      </span>
    )},
    { key: "category", label: "Category", hideOnMobile: true, render: (r) => <span className="text-xs text-muted-foreground">{r.category}</span> },
    { key: "summary", label: "Summary", hideOnMobile: true, render: (r) => <span className="text-xs text-muted-foreground truncate block max-w-[200px]">{r.summary}</span> },
    { key: "resolution", label: "Status", render: (r) => <StatusBadge status={r.resolution.toLowerCase().replace(/ /g, "-")} /> },
  ];

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        icon={MessageSquare}
        title="Listener Feedback"
        description="Aggregated listener feedback across all channels"
        iconColor="text-pink-400"
        iconBg="bg-pink-500/10 border-pink-500/20"
        badge={`${feedback.length} entries`}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Positive" value={positive} icon={ThumbsUp} color="text-emerald-400" bg="bg-emerald-500/10" trend={`${Math.round(positive / feedback.length * 100)}%`} trendUp={true} />
        <StatCard label="Neutral" value={neutral} icon={Minus} color="text-yellow-400" bg="bg-yellow-500/10" />
        <StatCard label="Negative" value={negative} icon={ThumbsDown} color="text-red-400" bg="bg-red-500/10" trend={`${Math.round(negative / feedback.length * 100)}%`} trendUp={false} />
        <StatCard label="Unresolved" value={openCount} icon={MessageSquare} color="text-blue-400" bg="bg-blue-500/10" trend="Needs attention" trendUp={openCount === 0} />
      </div>

      {/* Sentiment breakdown bar */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">Sentiment Distribution</p>
        <div className="flex h-4 rounded-full overflow-hidden">
          {positive > 0 && <div className="bg-emerald-400 transition-all" style={{ width: `${(positive / feedback.length) * 100}%` }} />}
          {neutral > 0 && <div className="bg-yellow-400 transition-all" style={{ width: `${(neutral / feedback.length) * 100}%` }} />}
          {negative > 0 && <div className="bg-red-400 transition-all" style={{ width: `${(negative / feedback.length) * 100}%` }} />}
        </div>
        <div className="flex items-center gap-6 mt-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><div className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Positive ({positive})</span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><div className="w-2.5 h-2.5 rounded-full bg-yellow-400" /> Neutral ({neutral})</span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><div className="w-2.5 h-2.5 rounded-full bg-red-400" /> Negative ({negative})</span>
        </div>
      </div>

      <TabsNav
        tabs={[
          { key: "All", label: "All", count: feedback.length },
          { key: "Positive", label: "Positive", count: positive },
          { key: "Neutral", label: "Neutral", count: neutral },
          { key: "Negative", label: "Negative", count: negative },
        ]}
        active={sentimentFilter}
        onChange={setSentimentFilter}
      />

      <DataTable
        columns={columns}
        data={filtered}
        keyField="id"
        searchable
        searchPlaceholder="Search feedback..."
        searchFilter={(r, q) => r.listenerName.toLowerCase().includes(q) || r.summary.toLowerCase().includes(q) || r.category.toLowerCase().includes(q)}
        onRowClick={(r) => setSelected(r)}
      />

      <DetailModal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.summary ?? ""}
        subtitle={selected ? `${selected.listenerName} via ${selected.channel} — ${formatDate(selected.date)}` : ""}
        maxWidth="max-w-2xl"
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1 text-sm font-medium ${
                selected.sentiment === "Positive" ? "text-emerald-400" : selected.sentiment === "Negative" ? "text-red-400" : "text-yellow-400"
              }`}>
                {selected.sentiment === "Positive" ? <ThumbsUp className="h-4 w-4" /> : selected.sentiment === "Negative" ? <ThumbsDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                {selected.sentiment}
              </span>
              <StatusBadge status={selected.resolution.toLowerCase().replace(/ /g, "-")} />
              <span className="text-xs bg-muted rounded-full px-2.5 py-1 text-muted-foreground">{selected.category}</span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Full Feedback</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{selected.fullText}</p>
            </div>
            {selected.resolvedBy && (
              <div>
                <p className="text-xs text-muted-foreground">Handled by: <span className="text-foreground">{selected.resolvedBy}</span></p>
              </div>
            )}
          </div>
        )}
      </DetailModal>
    </div>
  );
}
