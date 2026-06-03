"use client";

/**
 * Direct Messages — /my/messages
 *
 * A two-pane inbox for member-to-member DMs (any authenticated member can
 * message any other; RLS scopes reads/writes to the participants).
 *
 *   Left  — conversation list, grouped by the *other* participant. Each row
 *           shows their name/avatar (from profiles_public), the last message
 *           preview, a relative timestamp, and an unread badge.
 *   Right — the selected thread (my messages right/teal, theirs left), with a
 *           compose box that inserts a `messages` row. Opening a thread marks
 *           the other person's unread messages read.
 *
 * Data model (public.messages):
 *   id, sender_id, recipient_id, hub_type?, body, read_at, created_at
 *   RLS: SELECT where I'm sender|recipient; INSERT with sender_id = me;
 *        UPDATE (read_at) where recipient_id = me.
 *
 * Live updates: a Postgres-changes subscription on INSERTs addressed to me,
 * plus a 15s safety poll and an immediate refetch after sending.
 *
 * `?to=<userId>` opens (or starts) a conversation with that member directly.
 */

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  MessageCircle,
  Send,
  ArrowLeft,
  Loader2,
  MessagesSquare,
} from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

const TEAL = "#74ddc7";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface MessageRow {
  id: string;
  sender_id: string;
  recipient_id: string;
  hub_type: string | null;
  body: string;
  read_at: string | null;
  created_at: string;
}

interface PublicProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

/** A conversation = the other participant + their last message + unread tally. */
interface Conversation {
  otherId: string;
  name: string;
  avatar: string | null;
  lastBody: string;
  lastAt: string;
  /** True when I sent the most recent message (for the "You: " preview). */
  lastFromMe: boolean;
  unread: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compact relative time ("now", "5m", "3h", "2d", or a date). */
function relTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  if (Number.isNaN(then)) return "";
  const min = Math.floor(diff / 60000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Clock time for the thread bubbles. */
function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** Initials fallback when a member has no avatar. */
function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

/** The other participant in a row, relative to me. */
function otherOf(m: MessageRow, me: string): string {
  return m.sender_id === me ? m.recipient_id : m.sender_id;
}

// ---------------------------------------------------------------------------
// Page (wraps the client in Suspense — required for useSearchParams in an
// exported static build).
// ---------------------------------------------------------------------------
export default function MessagesPage() {
  return (
    <Suspense fallback={<InboxFallback />}>
      <MessagesInbox />
    </Suspense>
  );
}

function InboxFallback() {
  return (
    <div className="flex items-center justify-center py-24 text-muted-foreground">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" style={{ color: TEAL }} /> Loading messages…
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inbox
// ---------------------------------------------------------------------------
function MessagesInbox() {
  const searchParams = useSearchParams();
  const toParam = searchParams.get("to");

  // Lazy initializer → one stable browser client for this component's lifetime
  // (without reading a ref during render, which the react-hooks rules forbid).
  const [supabase] = useState(() => createClient());

  // Auth: undefined = resolving, null = signed out, string = my id.
  const [meId, setMeId] = useState<string | null | undefined>(undefined);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  // Profile cache so we can name conversations + the ?to target without refetching.
  const [profiles, setProfiles] = useState<Record<string, PublicProfile>>({});
  const [loadingList, setLoadingList] = useState(true);

  // Open conversation. Seeded from ?to=<id> so arriving via a MessageButton
  // opens that thread immediately without a synchronous setState-in-effect.
  const [activeOtherId, setActiveOtherId] = useState<string | null>(
    toParam && toParam.length > 0 ? toParam : null,
  );
  const [thread, setThread] = useState<MessageRow[]>([]);
  // Tracks which conversation `thread` currently holds rows for. When it lags
  // behind activeOtherId we know the thread is (re)loading — derived below
  // instead of toggling a loading flag synchronously inside the effect.
  const [threadLoadedFor, setThreadLoadedFor] = useState<string | null>(null);

  // Ref mirror of the open conversation so the once-registered realtime
  // callback can tell whether an incoming message belongs to the open thread
  // without re-subscribing on every selection change.
  const activeOtherIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeOtherIdRef.current = activeOtherId;
  }, [activeOtherId]);

  // Poll counter — bumped by the 15s safety interval to drive thread refetches.
  const [threadPollKey, setThreadPollKey] = useState(0);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  // Bump to force a conversation-list refetch (after send / realtime / poll).
  const [listKey, setListKey] = useState(0);
  const refreshList = useCallback(() => setListKey((k) => k + 1), []);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  // ---- Resolve the signed-in user once. ----
  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setMeId(data.user?.id ?? null);
    });
    return () => {
      active = false;
    };
  }, [supabase]);

  // ---- Fetch + fold the conversation list. ----
  // Pure async fetch returns the computed list + profile map; an `active`
  // guard keeps stale results from landing after unmount / a newer fetch.
  useEffect(() => {
    if (!meId) return;
    let active = true;

    async function loadConversations(): Promise<{
      list: Conversation[];
      profs: Record<string, PublicProfile>;
    } | null> {
      const me = meId as string;
      const { data: msgs, error } = await supabase
        .from("messages")
        .select("id, sender_id, recipient_id, hub_type, body, read_at, created_at")
        .or(`sender_id.eq.${me},recipient_id.eq.${me}`)
        .order("created_at", { ascending: false });
      if (error) return { list: [], profs: {} };

      const rows = (msgs as MessageRow[] | null) ?? [];

      // Fold into one entry per "other" participant. Rows arrive newest-first,
      // so the first time we see an other-id is their latest message.
      const byOther = new Map<string, Conversation>();
      for (const m of rows) {
        const other = otherOf(m, me);
        let conv = byOther.get(other);
        if (!conv) {
          conv = {
            otherId: other,
            name: "Member",
            avatar: null,
            lastBody: m.body,
            lastAt: m.created_at,
            lastFromMe: m.sender_id === me,
            unread: 0,
          };
          byOther.set(other, conv);
        }
        // Unread = messages addressed to me that I haven't read.
        if (m.recipient_id === me && m.read_at === null) conv.unread += 1;
      }

      // If we arrived via ?to=<id> with no history yet, seed an empty thread so
      // the member shows up in the list and opens on the right.
      if (toParam && toParam !== me && !byOther.has(toParam)) {
        byOther.set(toParam, {
          otherId: toParam,
          name: "Member",
          avatar: null,
          lastBody: "",
          lastAt: new Date(0).toISOString(),
          lastFromMe: false,
          unread: 0,
        });
      }

      // Resolve names/avatars for everyone in the list.
      const ids = [...byOther.keys()];
      const profs: Record<string, PublicProfile> = {};
      if (ids.length) {
        const { data: pd } = await supabase
          .from("profiles_public")
          .select("id, display_name, avatar_url")
          .in("id", ids);
        for (const p of (pd as PublicProfile[] | null) ?? []) {
          profs[p.id] = p;
          const conv = byOther.get(p.id);
          if (conv) {
            conv.name = p.display_name || "Member";
            conv.avatar = p.avatar_url;
          }
        }
      }

      const list = [...byOther.values()].sort(
        (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime(),
      );
      return { list, profs };
    }

    loadConversations().then((result) => {
      if (!active || !result) return;
      setConversations(result.list);
      setProfiles((prev) => ({ ...prev, ...result.profs }));
      setLoadingList(false);
      // Default-open the most recent conversation when nothing is selected yet
      // and we didn't arrive with ?to=. Done in the post-await callback so it
      // doesn't count as a synchronous setState in the effect body.
      if (result.list.length > 0) {
        setActiveOtherId((cur) => cur ?? result.list[0].otherId);
      }
    });

    return () => {
      active = false;
    };
  }, [supabase, meId, listKey, toParam]);

  // ---- Load the active thread + mark their messages read. ----
  useEffect(() => {
    if (!meId || !activeOtherId) return;
    let active = true;
    const openedId = activeOtherId;

    async function loadThread(): Promise<MessageRow[]> {
      const me = meId as string;
      const other = activeOtherId as string;
      const { data, error } = await supabase
        .from("messages")
        .select("id, sender_id, recipient_id, hub_type, body, read_at, created_at")
        .or(
          `and(sender_id.eq.${me},recipient_id.eq.${other}),and(sender_id.eq.${other},recipient_id.eq.${me})`,
        )
        .order("created_at", { ascending: true });
      if (error) return [];
      const rows = (data as MessageRow[] | null) ?? [];

      // Mark their unread messages as read (RLS allows recipient = me).
      const hasUnread = rows.some(
        (m) => m.recipient_id === me && m.sender_id === other && m.read_at === null,
      );
      if (hasUnread) {
        await supabase
          .from("messages")
          .update({ read_at: new Date().toISOString() })
          .eq("recipient_id", me)
          .eq("sender_id", other)
          .is("read_at", null);
      }
      return rows;
    }

    loadThread().then((rows) => {
      if (!active) return;
      setThread(rows);
      setThreadLoadedFor(openedId);
      // Clear this conversation's unread badge locally now that it's open.
      setConversations((prev) =>
        prev.map((c) => (c.otherId === openedId ? { ...c, unread: 0 } : c)),
      );
    });

    return () => {
      active = false;
    };
  }, [supabase, meId, activeOtherId]);

  // ---- Make sure the active member has a profile entry (for the header). ----
  useEffect(() => {
    if (!activeOtherId || profiles[activeOtherId]) return;
    let active = true;
    supabase
      .from("profiles_public")
      .select("id, display_name, avatar_url")
      .eq("id", activeOtherId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active || !data) return;
        setProfiles((prev) => ({ ...prev, [activeOtherId]: data as PublicProfile }));
      });
    return () => {
      active = false;
    };
  }, [supabase, activeOtherId, profiles]);

  // ---- Realtime: append INSERTs addressed to me; refresh the list. ----
  // Realtime callbacks may call setState directly (they're not in the
  // synchronous effect path that the set-state-in-effect lint guards).
  useEffect(() => {
    if (!meId) return;
    const me = meId as string;
    let channel: RealtimeChannel | null = null;

    channel = supabase
      .channel(`dm:${me}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `recipient_id=eq.${me}`,
        },
        (payload) => {
          const row = payload.new as MessageRow;
          // If it belongs to the open thread, append it inline (dedup by id).
          setThread((prev) => {
            if (row.sender_id !== activeOtherIdRef.current) return prev;
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row];
          });
          // Always refresh the list (preview, ordering, unread tally).
          refreshList();
        },
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase, meId, refreshList]);

  // ---- Safety net: poll every 15s in case realtime isn't available. ----
  useEffect(() => {
    if (!meId) return;
    const id = window.setInterval(() => {
      refreshList();
      setThreadPollKey((k) => k + 1);
    }, 15000);
    return () => window.clearInterval(id);
  }, [meId, refreshList]);

  // Poll-driven thread refetch (separate from the open/markRead effect so the
  // poll doesn't re-run the read-marking write needlessly when nothing changed).
  useEffect(() => {
    if (!meId || !activeOtherId || threadPollKey === 0) return;
    let active = true;
    const me = meId as string;
    const other = activeOtherId;
    supabase
      .from("messages")
      .select("id, sender_id, recipient_id, hub_type, body, read_at, created_at")
      .or(
        `and(sender_id.eq.${me},recipient_id.eq.${other}),and(sender_id.eq.${other},recipient_id.eq.${me})`,
      )
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (!active) return;
        setThread((data as MessageRow[] | null) ?? []);
      });
    return () => {
      active = false;
    };
  }, [supabase, meId, activeOtherId, threadPollKey]);

  // ---- Auto-scroll the thread to the newest message. ----
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.length, activeOtherId]);

  // ---- Send a message. ----
  const sendMessage = useCallback(async () => {
    const body = draft.trim();
    if (!body || !meId || !activeOtherId || sending) return;
    setSending(true);

    const me = meId as string;
    const { data, error } = await supabase
      .from("messages")
      .insert({ sender_id: me, recipient_id: activeOtherId, body })
      .select("id, sender_id, recipient_id, hub_type, body, read_at, created_at")
      .single();

    if (!error && data) {
      const row = data as MessageRow;
      setThread((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
      setDraft("");
      refreshList();
    }
    setSending(false);
  }, [draft, meId, activeOtherId, sending, supabase, refreshList]);

  const activeProfile = activeOtherId ? profiles[activeOtherId] : undefined;
  const activeName = activeProfile?.display_name || "Member";
  // Thread is "loading" while the rows on screen don't yet match the open
  // conversation. Derived (not a state flag toggled in an effect).
  const loadingThread = activeOtherId != null && threadLoadedFor !== activeOtherId;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  // Signed out.
  if (meId === null) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <MessageCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Sign in to view your messages</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Direct messages let you talk with creators, vendors, and other listeners across WCCG.
            </p>
          </div>
          <Link
            href="/login"
            className="rounded-full px-5 py-2 text-sm font-bold text-[#0a0a0f] transition-opacity hover:opacity-90"
            style={{ backgroundColor: TEAL }}
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  // Resolving auth.
  if (meId === undefined) {
    return (
      <div className="space-y-6">
        <Header />
        <InboxFallback />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header />

      <div className="grid h-[calc(100vh-16rem)] min-h-[28rem] grid-cols-1 gap-4 md:grid-cols-[20rem_1fr]">
        {/* ---------- Conversation list ---------- */}
        <aside
          className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card ${
            activeOtherId ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-bold text-foreground">Conversations</h2>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loadingList ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" style={{ color: TEAL }} />
              </div>
            ) : conversations.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm font-medium text-foreground">No conversations yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Start one from a member&apos;s profile or a hub&apos;s Members card.
                </p>
              </div>
            ) : (
              <ul>
                {conversations.map((c) => {
                  const isActive = c.otherId === activeOtherId;
                  const preview =
                    c.lastBody === ""
                      ? "Start the conversation"
                      : `${c.lastFromMe ? "You: " : ""}${c.lastBody}`;
                  return (
                    <li key={c.otherId}>
                      <button
                        type="button"
                        onClick={() => setActiveOtherId(c.otherId)}
                        className={`flex w-full items-center gap-3 border-b border-border/60 px-4 py-3 text-left transition-colors hover:bg-foreground/[0.04] ${
                          isActive ? "bg-foreground/[0.05]" : ""
                        }`}
                      >
                        <Avatar name={c.name} avatar={c.avatar} size={40} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-semibold text-foreground">
                              {c.name}
                            </span>
                            {c.lastBody !== "" && (
                              <span className="shrink-0 text-[10px] text-muted-foreground">
                                {relTime(c.lastAt)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`truncate text-xs ${
                                c.unread > 0
                                  ? "font-semibold text-foreground"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {preview}
                            </span>
                            {c.unread > 0 && (
                              <span
                                className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-bold text-[#0a0a0f]"
                                style={{ backgroundColor: TEAL }}
                              >
                                {c.unread}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* ---------- Thread ---------- */}
        <section
          className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card ${
            activeOtherId ? "flex" : "hidden md:flex"
          }`}
        >
          {!activeOtherId ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground">
              <MessagesSquare className="h-10 w-10" style={{ color: TEAL }} />
              <p className="text-sm">Select a conversation to start messaging.</p>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <button
                  type="button"
                  onClick={() => setActiveOtherId(null)}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground md:hidden"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <Avatar name={activeName} avatar={activeProfile?.avatar_url ?? null} size={36} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">{activeName}</p>
                  <p className="text-[11px] text-muted-foreground">Direct message</p>
                </div>
              </div>

              {/* Messages */}
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4">
                {loadingThread ? (
                  <div className="flex items-center justify-center py-10 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" style={{ color: TEAL }} />
                  </div>
                ) : thread.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                    <MessageCircle className="h-8 w-8" style={{ color: TEAL }} />
                    <p className="text-sm">No messages yet — say hello to {activeName}.</p>
                  </div>
                ) : (
                  thread.map((m) => {
                    const mine = m.sender_id === meId;
                    return (
                      <div
                        key={m.id}
                        className={`flex ${mine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${
                            mine
                              ? "text-[#0a0a0f]"
                              : "border border-border bg-foreground/[0.04] text-foreground"
                          }`}
                          style={mine ? { backgroundColor: TEAL } : undefined}
                        >
                          <p className="whitespace-pre-wrap break-words">{m.body}</p>
                          <span
                            className={`mt-1 block text-right text-[10px] ${
                              mine ? "text-[#0a0a0f]/60" : "text-muted-foreground"
                            }`}
                          >
                            {clockTime(m.created_at)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Compose */}
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
                  placeholder={`Message ${activeName}…`}
                  className="max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-xl border border-border bg-foreground/[0.04] px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-1"
                  style={{ ["--tw-ring-color" as string]: TEAL }}
                />
                <button
                  type="submit"
                  disabled={sending || draft.trim() === ""}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#0a0a0f] transition-opacity hover:opacity-90 disabled:opacity-40"
                  style={{ backgroundColor: TEAL }}
                  aria-label="Send message"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small presentational pieces
// ---------------------------------------------------------------------------
function Header() {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${TEAL}1a` }}
      >
        <MessageCircle className="h-5 w-5" style={{ color: TEAL }} />
      </div>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
        <p className="text-muted-foreground">
          Your direct conversations with members across WCCG
        </p>
      </div>
    </div>
  );
}

function Avatar({
  name,
  avatar,
  size,
}: {
  name: string;
  avatar: string | null;
  size: number;
}) {
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border text-[11px] font-semibold"
      style={{
        height: size,
        width: size,
        backgroundColor: `${TEAL}1a`,
        color: TEAL,
      }}
      title={name}
    >
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt={name} className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
    </div>
  );
}
