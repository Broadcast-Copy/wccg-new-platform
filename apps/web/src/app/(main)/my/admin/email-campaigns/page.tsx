"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useAuth } from "@/hooks/use-auth";
import {
  Mail,
  Loader2,
  ArrowLeft,
  Plus,
  Send,
  Eye,
  Users,
  MousePointerClick,
  BarChart3,
  Clock,
  CheckCircle2,
  FileText,
  Calendar,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

/* ---------- Types ---------- */

interface Segment {
  id: string;
  name: string;
  estimated_size: number;
}

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  segment_id: string | null;
  segment_name: string;
  status: string;
  scheduled_at: string | null;
  sent_count: number;
  open_count: number;
  click_count: number;
  created_at: string;
}

/* ---------- Templates ---------- */

const TEMPLATES: Record<string, { subject: string; body: string }> = {
  newsletter: {
    subject: "WCCG Weekly Newsletter - [Date]",
    body: `<h1>WCCG 104.5 FM Weekly Update</h1>
<p>Hey there, WCCG family!</p>
<p>Here's what's happening this week at your favorite station:</p>
<h2>Top Stories</h2>
<ul>
  <li>New music dropping this Friday</li>
  <li>Upcoming community events</li>
  <li>Contest winners announced</li>
</ul>
<h2>This Week's Playlist</h2>
<p>Check out the hottest tracks we've been spinning...</p>
<p>Stay tuned,<br/>The WCCG Team</p>`,
  },
  event_invite: {
    subject: "You're Invited: [Event Name] at WCCG",
    body: `<h1>You're Invited!</h1>
<p>WCCG 104.5 FM presents an exclusive event:</p>
<h2>[Event Name]</h2>
<p><strong>Date:</strong> [Date]</p>
<p><strong>Time:</strong> [Time]</p>
<p><strong>Location:</strong> [Venue]</p>
<p>Join us for an unforgettable experience with live music, giveaways, and more!</p>
<p><a href="#">RSVP Now</a></p>
<p>See you there!<br/>WCCG 104.5 FM</p>`,
  },
  product_launch: {
    subject: "Introducing: [Product/Feature Name]",
    body: `<h1>Something New from WCCG</h1>
<p>We're excited to announce the launch of [Product/Feature]!</p>
<h2>What's New</h2>
<p>Describe the product or feature here...</p>
<h2>How It Works</h2>
<ol>
  <li>Step one</li>
  <li>Step two</li>
  <li>Step three</li>
</ol>
<p><a href="#">Try It Now</a></p>
<p>Best,<br/>The WCCG Team</p>`,
  },
  announcement: {
    subject: "Important Update from WCCG 104.5 FM",
    body: `<h1>Important Announcement</h1>
<p>Dear WCCG family,</p>
<p>We have an important update to share with you:</p>
<p>[Your announcement here]</p>
<p>Thank you for being part of the WCCG community.</p>
<p>Sincerely,<br/>WCCG 104.5 FM</p>`,
  },
};

/* ---------- Mock data ---------- */

const MOCK_SEGMENTS: Segment[] = [
  { id: "seg-1", name: "All Listeners", estimated_size: 15200 },
  { id: "seg-2", name: "Hip-Hop Fans", estimated_size: 8400 },
  { id: "seg-3", name: "Cumberland County", estimated_size: 6100 },
  { id: "seg-4", name: "Event Attendees", estimated_size: 2300 },
  { id: "seg-5", name: "New Subscribers (30 days)", estimated_size: 890 },
];

const MOCK_CAMPAIGNS: EmailCampaign[] = [
  {
    id: "ec-1",
    name: "March Newsletter",
    subject: "WCCG Weekly Newsletter - March 2026",
    body_html: "<h1>March Update</h1><p>Check out what's new...</p>",
    segment_id: "seg-1",
    segment_name: "All Listeners",
    status: "sent",
    scheduled_at: null,
    sent_count: 14850,
    open_count: 5940,
    click_count: 1188,
    created_at: "2026-03-15T10:00:00Z",
  },
  {
    id: "ec-2",
    name: "Spring Concert Invite",
    subject: "You're Invited: Spring Concert at WCCG",
    body_html:
      "<h1>Spring Concert</h1><p>Join us April 15th for live music!</p>",
    segment_id: "seg-4",
    segment_name: "Event Attendees",
    status: "scheduled",
    scheduled_at: "2026-04-05T09:00:00Z",
    sent_count: 0,
    open_count: 0,
    click_count: 0,
    created_at: "2026-03-28T14:00:00Z",
  },
  {
    id: "ec-3",
    name: "New App Feature",
    subject: "Introducing: WCCG Listening Points",
    body_html:
      "<h1>Earn Points!</h1><p>Listen and earn rewards with our new points system.</p>",
    segment_id: "seg-2",
    segment_name: "Hip-Hop Fans",
    status: "draft",
    scheduled_at: null,
    sent_count: 0,
    open_count: 0,
    click_count: 0,
    created_at: "2026-03-29T11:30:00Z",
  },
];

/* ---------- Helpers ---------- */

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-foreground/[0.06] text-muted-foreground border-border",
  scheduled: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  sent: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  draft: FileText,
  scheduled: Clock,
  sent: CheckCircle2,
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

function openRate(sent: number, opens: number): string {
  if (sent === 0) return "0.0";
  return ((opens / sent) * 100).toFixed(1);
}

/* ---------- Main Page ---------- */

export default function EmailCampaignsPage() {
  const { supabase } = useSupabase();
  const { user, isLoading: authLoading } = useAuth();
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: "",
    subject: "",
    body_html: "",
    segment_id: "",
    scheduled_at: "",
  });

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function load() {
      try {
        // Load segments
        const { data: segData } = await supabase
          .from("audience_segments")
          .select("id, name, estimated_size")
          .eq("is_active", true)
          .order("name");

        setSegments(segData && segData.length > 0 ? segData : MOCK_SEGMENTS);

        // Load email campaigns
        const { data: campData } = await supabase
          .from("email_campaigns")
          .select("*")
          .order("created_at", { ascending: false });

        if (campData && campData.length > 0) {
          setCampaigns(campData);
        } else {
          setCampaigns(MOCK_CAMPAIGNS);
        }
      } catch {
        setSegments(MOCK_SEGMENTS);
        setCampaigns(MOCK_CAMPAIGNS);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user, supabase]);

  function applyTemplate(key: string) {
    const template = TEMPLATES[key];
    if (template) {
      setForm((prev) => ({
        ...prev,
        subject: template.subject,
        body_html: template.body,
      }));
      toast.success("Template applied");
    }
  }

  async function handleCreate() {
    if (!form.name.trim()) {
      toast.error("Campaign name is required");
      return;
    }
    if (!form.subject.trim()) {
      toast.error("Subject line is required");
      return;
    }

    setCreating(true);
    try {
      const segmentName =
        segments.find((s) => s.id === form.segment_id)?.name || "All";

      const newCampaign: EmailCampaign = {
        id: `ec-${Date.now()}`,
        name: form.name,
        subject: form.subject,
        body_html: form.body_html,
        segment_id: form.segment_id || null,
        segment_name: segmentName,
        status: form.scheduled_at ? "scheduled" : "draft",
        scheduled_at: form.scheduled_at || null,
        sent_count: 0,
        open_count: 0,
        click_count: 0,
        created_at: new Date().toISOString(),
      };

      // Try to insert into Supabase
      const { data, error } = await supabase
        .from("email_campaigns")
        .insert({
          name: form.name,
          subject: form.subject,
          body_html: form.body_html,
          segment_id: form.segment_id || null,
          status: form.scheduled_at ? "scheduled" : "draft",
          scheduled_at: form.scheduled_at || null,
        })
        .select()
        .single();

      if (error) {
        // Fallback to local state
        setCampaigns((prev) => [newCampaign, ...prev]);
      } else if (data) {
        setCampaigns((prev) => [
          { ...data, segment_name: segmentName, sent_count: 0, open_count: 0, click_count: 0 },
          ...prev,
        ]);
      }

      toast.success("Email campaign created");
      setShowForm(false);
      setForm({
        name: "",
        subject: "",
        body_html: "",
        segment_id: "",
        scheduled_at: "",
      });
    } catch {
      toast.error("Failed to create campaign");
    } finally {
      setCreating(false);
    }
  }

  function handleSendNow(campaign: EmailCampaign) {
    console.log("[EMAIL SEND] Campaign:", campaign.name);
    console.log("[EMAIL SEND] Subject:", campaign.subject);
    console.log("[EMAIL SEND] Segment:", campaign.segment_name);
    console.log("[EMAIL SEND] Body:", campaign.body_html);
    console.log(
      "[EMAIL SEND] NOTE: Requires email provider API key (SendGrid, Mailgun, etc.)"
    );

    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === campaign.id
          ? {
              ...c,
              status: "sent",
              sent_count:
                segments.find((s) => s.id === c.segment_id)?.estimated_size ||
                0,
            }
          : c
      )
    );
    toast.success(
      "Send logged to console. Connect an email provider to send for real."
    );
  }

  const isLoading = authLoading || loading;

  // Stats
  const totalSent = campaigns
    .filter((c) => c.status === "sent")
    .reduce((s, c) => s + c.sent_count, 0);
  const totalOpens = campaigns.reduce((s, c) => s + c.open_count, 0);
  const totalClicks = campaigns.reduce((s, c) => s + c.click_count, 0);
  const avgOpenRate =
    totalSent > 0 ? ((totalOpens / totalSent) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-background via-red-950/20 to-background border border-border/30">
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-700 shadow-xl">
                <Mail className="h-7 w-7 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Link
                    href="/my/admin"
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    Admin
                  </Link>
                  <span className="text-foreground/20">/</span>
                  <span className="text-foreground text-sm font-medium">
                    Email Campaigns
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-foreground">
                  Email Campaigns
                </h1>
                <p className="text-muted-foreground mt-1">
                  Create and manage email campaigns for your audience
                </p>
              </div>
            </div>
            <div className="hidden sm:block">
              <Button
                onClick={() => setShowForm(!showForm)}
                className="rounded-full bg-[#dc2626] text-white font-bold hover:bg-[#b91c1c] px-5"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                New Campaign
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile button */}
      <div className="sm:hidden">
        <Button
          onClick={() => setShowForm(!showForm)}
          className="rounded-full bg-[#dc2626] text-white font-bold hover:bg-[#b91c1c] px-5"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          New Campaign
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground text-sm">
            Loading email campaigns...
          </span>
        </div>
      )}

      {/* Auth required */}
      {!isLoading && !user && (
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8 text-center">
          <p className="text-muted-foreground text-sm">
            Please{" "}
            <Link href="/login" className="text-[#dc2626] hover:underline">
              sign in
            </Link>{" "}
            as an admin to manage email campaigns.
          </p>
        </div>
      )}

      {!isLoading && user && (
        <>
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Campaigns",
                value: campaigns.length,
                icon: Mail,
                color: "text-red-400",
                bg: "bg-red-500/10",
              },
              {
                label: "Total Sent",
                value: formatNumber(totalSent),
                icon: Send,
                color: "text-blue-400",
                bg: "bg-blue-500/10",
              },
              {
                label: "Total Opens",
                value: formatNumber(totalOpens),
                icon: Eye,
                color: "text-emerald-400",
                bg: "bg-emerald-500/10",
              },
              {
                label: "Avg Open Rate",
                value: `${avgOpenRate}%`,
                icon: BarChart3,
                color: "text-purple-400",
                bg: "bg-purple-500/10",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-border bg-card p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                    {stat.label}
                  </span>
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.bg}`}
                  >
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Create Form */}
          {showForm && (
            <div className="rounded-xl border border-red-500/20 bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-foreground">
                    Create Email Campaign
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Compose and schedule an email campaign
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setShowForm(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="p-5 space-y-4">
                {/* Template Presets */}
                <div className="space-y-1.5">
                  <Label className="text-foreground/60">Quick Templates</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "newsletter", label: "Newsletter" },
                      { key: "event_invite", label: "Event Invite" },
                      { key: "product_launch", label: "Product Launch" },
                      { key: "announcement", label: "Announcement" },
                    ].map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => applyTemplate(t.key)}
                        className="text-xs px-3 py-1.5 rounded-full border border-border bg-foreground/[0.04] text-muted-foreground hover:border-red-500/40 hover:text-red-400 transition-colors"
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name */}
                <div className="space-y-1.5">
                  <Label className="text-foreground/60">Campaign Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    placeholder="e.g. April Newsletter"
                    className="bg-foreground/[0.04] border-border text-foreground placeholder:text-foreground/20"
                  />
                </div>

                {/* Subject */}
                <div className="space-y-1.5">
                  <Label className="text-foreground/60">Subject Line *</Label>
                  <Input
                    value={form.subject}
                    onChange={(e) =>
                      setForm({ ...form, subject: e.target.value })
                    }
                    placeholder="Email subject line"
                    className="bg-foreground/[0.04] border-border text-foreground placeholder:text-foreground/20"
                  />
                </div>

                {/* Segment + Schedule */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-foreground/60">
                      Target Segment
                    </Label>
                    <Select
                      value={form.segment_id}
                      onValueChange={(v) =>
                        setForm({ ...form, segment_id: v })
                      }
                    >
                      <SelectTrigger className="bg-foreground/[0.04] border-border text-foreground">
                        <SelectValue placeholder="Select segment" />
                      </SelectTrigger>
                      <SelectContent>
                        {segments.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} ({formatNumber(s.estimated_size)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-foreground/60">Schedule Date</Label>
                    <Input
                      type="datetime-local"
                      value={form.scheduled_at}
                      onChange={(e) =>
                        setForm({ ...form, scheduled_at: e.target.value })
                      }
                      className="bg-foreground/[0.04] border-border text-foreground"
                    />
                  </div>
                </div>

                {/* Body Editor + Preview */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-foreground/60">
                      Email Body (HTML)
                    </Label>
                    <button
                      type="button"
                      onClick={() => setShowPreview(!showPreview)}
                      className="text-xs text-red-400 hover:underline"
                    >
                      {showPreview ? "Hide Preview" : "Show Preview"}
                    </button>
                  </div>
                  <Textarea
                    value={form.body_html}
                    onChange={(e) =>
                      setForm({ ...form, body_html: e.target.value })
                    }
                    placeholder="<h1>Hello!</h1><p>Your email content here...</p>"
                    rows={8}
                    className="bg-foreground/[0.04] border-border text-foreground placeholder:text-foreground/20 resize-y font-mono text-xs"
                  />
                </div>

                {/* HTML Preview */}
                {showPreview && form.body_html && (
                  <div className="rounded-lg border border-border bg-white p-6 overflow-auto max-h-96">
                    <div
                      className="prose prose-sm max-w-none text-black"
                      dangerouslySetInnerHTML={{ __html: form.body_html }}
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 justify-end pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowForm(false)}
                    className="border-border text-foreground/60 hover:bg-foreground/[0.04]"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={creating}
                    className="bg-[#dc2626] text-white font-bold hover:bg-[#b91c1c]"
                  >
                    {creating && (
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    )}
                    {form.scheduled_at ? "Schedule Campaign" : "Save as Draft"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Campaign List */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">All Campaigns</h2>
            </div>

            {campaigns.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <Mail className="h-10 w-10 text-foreground/20 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-foreground mb-1">
                  No email campaigns yet
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Create your first email campaign to reach your audience.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {campaigns.map((campaign) => {
                  const StatusIcon =
                    STATUS_ICONS[campaign.status] || FileText;
                  const or = openRate(
                    campaign.sent_count,
                    campaign.open_count
                  );

                  return (
                    <div
                      key={campaign.id}
                      className="px-5 py-4 hover:bg-foreground/[0.02] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <StatusIcon className="h-4 w-4 text-muted-foreground/70 shrink-0" />
                            <p className="text-sm font-medium text-foreground truncate">
                              {campaign.name}
                            </p>
                            <Badge
                              className={`text-[10px] border capitalize ${
                                STATUS_STYLES[campaign.status] ||
                                "bg-foreground/[0.06] text-muted-foreground border-border"
                              }`}
                            >
                              {campaign.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mb-2">
                            Subject: {campaign.subject}
                          </p>

                          {/* Stats row */}
                          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {campaign.segment_name}
                            </span>
                            {campaign.status === "sent" && (
                              <>
                                <span className="flex items-center gap-1">
                                  <Send className="h-3 w-3" />
                                  {formatNumber(campaign.sent_count)} sent
                                </span>
                                <span className="flex items-center gap-1">
                                  <Eye className="h-3 w-3" />
                                  {formatNumber(campaign.open_count)} opens (
                                  {or}%)
                                </span>
                                <span className="flex items-center gap-1">
                                  <MousePointerClick className="h-3 w-3" />
                                  {formatNumber(campaign.click_count)} clicks
                                </span>
                              </>
                            )}
                            {campaign.status === "scheduled" &&
                              campaign.scheduled_at && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Scheduled: {formatDate(campaign.scheduled_at)}
                                </span>
                              )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Created: {formatDate(campaign.created_at)}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="shrink-0">
                          {campaign.status !== "sent" && (
                            <Button
                              size="sm"
                              onClick={() => handleSendNow(campaign)}
                              className="bg-[#dc2626] text-white font-bold hover:bg-[#b91c1c]"
                            >
                              <Send className="h-3.5 w-3.5 mr-1" />
                              Send Now
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Back Link */}
      <div className="flex justify-center">
        <Button
          asChild
          variant="ghost"
          className="text-muted-foreground hover:text-foreground"
        >
          <Link href="/my/admin">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Admin
          </Link>
        </Button>
      </div>
    </div>
  );
}
