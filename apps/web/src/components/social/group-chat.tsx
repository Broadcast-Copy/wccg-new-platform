"use client";

/**
 * GroupChat — the live chat panel for a single hub group.
 *
 * Supabase-direct + Realtime (no API server):
 *   • Initial load fetches the group's messages (hub_group_messages) ordered
 *     oldest→newest, then resolves the authors' public profiles
 *     (profiles_public) in one round-trip and folds names/avatars in. The fetch
 *     is a pure async function whose result lands behind an `active` guard, so
 *     no setState runs synchronously in the effect body.
 *   • A postgres_changes subscription (INSERT on hub_group_messages filtered by
 *     group_id) appends new messages live. Realtime callbacks may setState
 *     directly — they are not on the synchronous effect path the
 *     react-hooks/set-state-in-effect lint guards. The channel is torn down on
 *     unmount / group change.
 *   • The composer inserts a hub_group_messages row (user_id = me). It is only
 *     rendered for members; RLS is the real backstop server-side.
 *
 * RLS lets non-members read a *public* group's chat (read-only), so the list is
 * always shown when reachable; only the composer is membership-gated.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle, Send } from "lucide-react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface GroupMessageRow {
  id: string;
  group_id: string;
  user_id: string;
  body: string;
  created_at: string;
}

interface PublicProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

/** A message joined to its author's display name + avatar for rendering. */
interface ChatMessage extends GroupMessageRow {
  authorName: string;
  authorAvatar: string | null;
}

interface GroupChatProps {
  supabase: SupabaseClient;
  groupId: string;
  /** Current user's id, or null when signed out. Gates the composer. */
  meId: string | null;
  /** Whether the current user is a member of this group (composer gate). */
  isMember: boolean;
  accentColor: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Clock time for a chat bubble. */
function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Initials fallback when an author has no avatar. */
function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function GroupChat({
  supabase,
  groupId,
  meId,
  isMember,
  accentColor,
}: GroupChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  // Small profile cache so realtime-arrived messages can resolve an author we
  // already know without an extra fetch.
  const profileCacheRef = useRef<Record<string, PublicProfile>>({});
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // ---- Initial load: messages + author profiles. ----
  // Pure async fetch returns the folded rows; an `active` guard drops stale /
  // post-unmount results. No synchronous setState in the effect body — the
  // initial `loading`/`loadError` state covers the pre-await window, and the
  // post-await callback flips them once. (groupId is fixed per route, so this
  // effect runs once for the component's lifetime.)
  useEffect(() => {
    let active = true;

    async function loadMessages(): Promise<ChatMessage[] | null> {
      const { data: msgData, error } = await supabase
        .from("hub_group_messages")
        .select("id, group_id, user_id, body, created_at")
        .eq("group_id", groupId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) return null;
      const rows = (msgData as GroupMessageRow[] | null) ?? [];
      if (rows.length === 0) return [];

      // Resolve the distinct authors' public profiles in one round-trip.
      const ids = [...new Set(rows.map((r) => r.user_id))];
      const profs: Record<string, PublicProfile> = {};
      const { data: pd } = await supabase
        .from("profiles_public")
        .select("id, display_name, avatar_url")
        .in("id", ids);
      for (const p of (pd as PublicProfile[] | null) ?? []) {
        profs[p.id] = p;
      }
      // Merge into the shared cache for later realtime lookups.
      profileCacheRef.current = { ...profileCacheRef.current, ...profs };

      return rows.map((r) => ({
        ...r,
        authorName: profs[r.user_id]?.display_name || "Member",
        authorAvatar: profs[r.user_id]?.avatar_url ?? null,
      }));
    }

    loadMessages().then((result) => {
      if (!active) return;
      if (result === null) {
        setLoadError(true);
      } else {
        setMessages(result);
      }
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [supabase, groupId]);

  // ---- Realtime: append INSERTs for this group. ----
  // Callback setState is fine here (not the synchronous effect path). We dedup
  // by id so an echo of our own optimistic insert doesn't double up.
  useEffect(() => {
    let channel: RealtimeChannel | null = null;

    channel = supabase
      .channel(`group-chat:${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "hub_group_messages",
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          const row = payload.new as GroupMessageRow;
          const cached = profileCacheRef.current[row.user_id];
          const incoming: ChatMessage = {
            ...row,
            authorName: cached?.display_name || "Member",
            authorAvatar: cached?.avatar_url ?? null,
          };
          setMessages((prev) =>
            prev.some((m) => m.id === row.id) ? prev : [...prev, incoming],
          );

          // If we don't yet know this author, fetch + backfill the bubble.
          if (!cached) {
            supabase
              .from("profiles_public")
              .select("id, display_name, avatar_url")
              .eq("id", row.user_id)
              .maybeSingle()
              .then(({ data }) => {
                if (!data) return;
                const prof = data as PublicProfile;
                profileCacheRef.current[prof.id] = prof;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.user_id === prof.id
                      ? {
                          ...m,
                          authorName: prof.display_name || "Member",
                          authorAvatar: prof.avatar_url ?? null,
                        }
                      : m,
                  ),
                );
              });
          }
        },
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase, groupId]);

  // ---- Auto-scroll to the newest message. ----
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // ---- Send a message (members only; RLS enforces server-side). ----
  const sendMessage = useCallback(async () => {
    const body = draft.trim();
    if (!body || !meId || !isMember || sending) return;
    setSending(true);

    const { data, error } = await supabase
      .from("hub_group_messages")
      .insert({ group_id: groupId, user_id: meId, body })
      .select("id, group_id, user_id, body, created_at")
      .single();

    if (!error && data) {
      const row = data as GroupMessageRow;
      const cached = profileCacheRef.current[row.user_id];
      const mine: ChatMessage = {
        ...row,
        authorName: cached?.display_name || "You",
        authorAvatar: cached?.avatar_url ?? null,
      };
      // Append immediately (dedup guards against the realtime echo).
      setMessages((prev) =>
        prev.some((m) => m.id === row.id) ? prev : [...prev, mine],
      );
      setDraft("");
    }
    setSending(false);
  }, [draft, meId, isMember, sending, supabase, groupId]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Messages */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: accentColor }} />
          </div>
        ) : loadError ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <MessageCircle className="h-8 w-8" style={{ color: accentColor }} />
            <p className="text-sm">Couldn&apos;t load the chat. Please try again.</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <MessageCircle className="h-8 w-8" style={{ color: accentColor }} />
            <p className="text-sm">
              {isMember
                ? "No messages yet — say something to the group."
                : "No messages yet."}
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.user_id === meId;
            return (
              <div
                key={m.id}
                className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}
              >
                {!mine && (
                  <div
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border text-[10px] font-semibold"
                    style={{ backgroundColor: `${accentColor}1a`, color: accentColor }}
                    title={m.authorName}
                  >
                    {m.authorAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.authorAvatar}
                        alt={m.authorName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initials(m.authorName)
                    )}
                  </div>
                )}
                <div className="max-w-[78%]">
                  {!mine && (
                    <span className="mb-0.5 block px-1 text-[11px] font-semibold text-muted-foreground">
                      {m.authorName}
                    </span>
                  )}
                  <div
                    className={`rounded-2xl px-3 py-2 text-sm ${
                      mine
                        ? "text-white"
                        : "border border-border bg-foreground/[0.04] text-foreground"
                    }`}
                    style={mine ? { backgroundColor: accentColor } : undefined}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <span
                      className={`mt-1 block text-right text-[10px] ${
                        mine ? "text-white/70" : "text-muted-foreground"
                      }`}
                    >
                      {clockTime(m.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer — members only. Non-members reach this panel only for public
          groups (read-only); the join prompt lives in the parent. */}
      {isMember ? (
        <form
          className="flex items-end gap-2 border-t border-border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void sendMessage();
          }}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendMessage();
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder="Message the group…"
            className="max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-xl border border-border bg-foreground/[0.04] px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-1"
            style={{ ["--tw-ring-color" as string]: accentColor }}
          />
          <button
            type="submit"
            disabled={sending || draft.trim() === ""}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: accentColor }}
            aria-label="Send message"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
      ) : (
        <div className="border-t border-border p-3 text-center text-xs text-muted-foreground">
          {meId
            ? "Join this group to send messages."
            : "Sign in and join this group to chat."}
        </div>
      )}
    </div>
  );
}
