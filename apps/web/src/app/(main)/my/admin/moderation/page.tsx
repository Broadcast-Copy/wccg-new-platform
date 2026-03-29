"use client";

import { useState, useEffect, useMemo } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  FileAudio,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ModerationItem {
  id: string;
  type: "hub_post" | "production";
  title: string | null;
  content: string | null;
  post_type: string | null;
  poster_name: string | null;
  poster_email: string | null;
  status: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ContentModerationPage() {
  const { supabase } = useSupabase();
  const { user, isLoading: authLoading } = useAuth();

  const [items, setItems] = useState<ModerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [showRejectInput, setShowRejectInput] = useState<string | null>(null);

  // Fetch pending content
  const fetchPending = async () => {
    setLoading(true);
    const results: ModerationItem[] = [];

    // Hub posts
    const { data: posts, error: postsErr } = await supabase
      .from("hub_posts")
      .select("id, title, content, post_type, status, created_at, profile_id")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (!postsErr && posts) {
      for (const p of posts) {
        // Try to get poster info
        let posterName = null;
        let posterEmail = null;
        if (p.profile_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, email")
            .eq("id", p.profile_id)
            .single();
          if (profile) {
            posterName = profile.display_name;
            posterEmail = profile.email;
          }
        }
        results.push({
          id: p.id,
          type: "hub_post",
          title: p.title,
          content: p.content,
          post_type: p.post_type,
          poster_name: posterName,
          poster_email: posterEmail,
          status: p.status,
          created_at: p.created_at,
        });
      }
    }

    // Productions
    const { data: prods, error: prodsErr } = await supabase
      .from("productions")
      .select("id, title, description, status, created_at, requested_by")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (!prodsErr && prods) {
      for (const p of prods) {
        let posterName = null;
        let posterEmail = null;
        if (p.requested_by) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, email")
            .eq("id", p.requested_by)
            .single();
          if (profile) {
            posterName = profile.display_name;
            posterEmail = profile.email;
          }
        }
        results.push({
          id: p.id,
          type: "production",
          title: p.title,
          content: p.description,
          post_type: null,
          poster_name: posterName,
          poster_email: posterEmail,
          status: p.status,
          created_at: p.created_at,
        });
      }
    }

    if (postsErr) console.error("hub_posts query error:", postsErr);
    if (prodsErr) console.error("productions query error:", prodsErr);

    setItems(results);
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Approve
  const handleApprove = async (item: ModerationItem) => {
    setActing(item.id);
    const table = item.type === "hub_post" ? "hub_posts" : "productions";
    const { error } = await supabase
      .from(table)
      .update({ status: "approved" })
      .eq("id", item.id);

    if (error) {
      toast.error("Failed to approve");
    } else {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      toast.success(`${item.type === "hub_post" ? "Post" : "Production"} approved`);
    }
    setActing(null);
  };

  // Reject
  const handleReject = async (item: ModerationItem) => {
    setActing(item.id);
    const table = item.type === "hub_post" ? "hub_posts" : "productions";
    const reason = rejectReason[item.id] || undefined;

    const updatePayload: Record<string, unknown> = { status: "rejected" };
    if (reason) updatePayload.rejection_reason = reason;

    const { error } = await supabase
      .from(table)
      .update(updatePayload)
      .eq("id", item.id);

    if (error) {
      toast.error("Failed to reject");
    } else {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      toast.success(`${item.type === "hub_post" ? "Post" : "Production"} rejected`);
    }
    setShowRejectInput(null);
    setActing(null);
  };

  // Stats
  const stats = useMemo(() => {
    const pending = items.length;
    // Approved/rejected today would come from separate queries in production;
    // for now we just show pending count
    return { pending, approvedToday: 0, rejectedToday: 0 };
  }, [items]);

  const hubPosts = items.filter((i) => i.type === "hub_post");
  const productions = items.filter((i) => i.type === "production");

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

  // Render a moderation card
  const renderCard = (item: ModerationItem) => (
    <div
      key={item.id}
      className="rounded-xl border border-border bg-card p-4 space-y-3 hover:border-input transition-colors"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {item.type === "hub_post" ? (
            <MessageSquare className="h-4 w-4 text-[#3b82f6]" />
          ) : (
            <FileAudio className="h-4 w-4 text-[#7401df]" />
          )}
          <span className="text-sm font-semibold text-foreground truncate">
            {item.title || "Untitled"}
          </span>
        </div>
        <Badge
          variant="outline"
          className="text-[10px] border-[#f59e0b]/30 text-[#f59e0b] shrink-0"
        >
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      </div>

      {/* Content preview */}
      {item.content && (
        <p className="text-xs text-muted-foreground line-clamp-3">
          {item.content}
        </p>
      )}

      {/* Meta */}
      <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground/70">
        <span>
          By: {item.poster_name || item.poster_email || "Unknown"}
        </span>
        {item.post_type && <span>Type: {item.post_type}</span>}
        <span>
          {new Date(item.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      </div>

      {/* Reject reason input */}
      {showRejectInput === item.id && (
        <div className="flex gap-2">
          <Input
            placeholder="Reason for rejection (optional)"
            value={rejectReason[item.id] || ""}
            onChange={(e) =>
              setRejectReason((prev) => ({ ...prev, [item.id]: e.target.value }))
            }
            className="text-xs h-8"
          />
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleReject(item)}
            disabled={acting === item.id}
            className="h-8 text-xs bg-[#dc2626] hover:bg-[#b91c1c]"
          >
            Confirm
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowRejectInput(null)}
            className="h-8 text-xs"
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Actions */}
      {showRejectInput !== item.id && (
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => handleApprove(item)}
            disabled={acting === item.id}
            className="h-8 text-xs bg-[#22c55e] hover:bg-[#16a34a] text-white"
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowRejectInput(item.id)}
            disabled={acting === item.id}
            className="h-8 text-xs border-[#dc2626]/30 text-[#dc2626] hover:bg-[#dc2626]/10"
          >
            <XCircle className="h-3.5 w-3.5 mr-1" />
            Reject
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#dc2626]/10 border border-[#dc2626]/20">
            <AlertTriangle className="h-7 w-7 text-[#dc2626]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Content Moderation
            </h1>
            <p className="text-sm text-muted-foreground">
              Review and approve pending content
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchPending}
          disabled={loading}
          className="border-[#dc2626]/30 text-[#dc2626] hover:bg-[#dc2626]/10"
        >
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Pending Review
          </p>
          <p className="mt-1 text-2xl font-bold text-[#f59e0b]">
            {stats.pending}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Approved Today
          </p>
          <p className="mt-1 text-2xl font-bold text-[#22c55e]">
            {stats.approvedToday}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Rejected Today
          </p>
          <p className="mt-1 text-2xl font-bold text-[#dc2626]">
            {stats.rejectedToday}
          </p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle2 className="h-10 w-10 text-[#22c55e] mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">All clear!</p>
          <p className="text-xs text-muted-foreground mt-1">
            No pending content to review.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Hub Posts Section */}
          {hubPosts.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-[#3b82f6]" />
                Hub Posts
                <Badge variant="outline" className="text-[10px] ml-1">
                  {hubPosts.length}
                </Badge>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {hubPosts.map(renderCard)}
              </div>
            </section>
          )}

          {/* Productions Section */}
          {productions.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <FileAudio className="h-5 w-5 text-[#7401df]" />
                Productions
                <Badge variant="outline" className="text-[10px] ml-1">
                  {productions.length}
                </Badge>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {productions.map(renderCard)}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="rounded-xl border border-border bg-card p-4 text-center">
        <p className="text-xs text-muted-foreground/60">
          Content moderation queue for WCCG 104.5 FM
        </p>
      </div>
    </div>
  );
}
