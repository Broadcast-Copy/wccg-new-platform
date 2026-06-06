"use client";

/**
 * MessengerDock — site-wide floating direct-message dock (bottom-right).
 *
 * Replaces the old AI-chat stub with a real, Facebook-Messenger-style dock that
 * surfaces the signed-in member's direct messages everywhere in the app.
 *
 *   Collapsed — a teal circular launcher with a total-unread badge.
 *   Expanded  — a 360px panel with two sub-views:
 *     • LIST   — "Chats" (existing conversations folded from `messages`, newest
 *                first) + "Friends" (members you follow not already in Chats,
 *                tap to start a new thread).
 *     • THREAD — the selected conversation: message bubbles + a compose box.
 *
 * Accent color: the brand teal (#74ddc7) by default, but when the OPEN thread's
 * other participant is an internal team member (`profiles_public.is_internal`)
 * the thread chrome (header, my bubbles, send button) switches to the staff
 * purple (#7401df). The collapsed launcher always stays teal.
 *
 * Data model (public.messages): id, sender_id, recipient_id, hub_type, body,
 *   read_at, created_at. RLS: SELECT where I'm sender|recipient; INSERT with
 *   sender_id = me; UPDATE(read_at) where recipient_id = me.
 * "Friends" = members you follow (public.follows; one-directional contacts).
 * Names/avatars/team-flag come from the PII-safe `profiles_public` view.
 *
 * Live updates mirror /my/messages: a postgres_changes INSERT subscription
 * filtered to messages addressed to me, plus a 15s safety poll, plus an
 * immediate refetch after sending.
 *
 * Hooks discipline (the repo enforces react-hooks/set-state-in-effect): no
 * setState is ever called synchronously in an effect body. Every effect either
 * (a) does its setState after an `await`, guarded by a local `active` flag, or
 * (b) is a realtime / interval callback (not on the synchronous effect path), or
 * (c) uses a lazy useState initializer. Renders nothing when signed out.
 *
 * Static-export safe: client-only, uses the browser anon client; no server APIs.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  MessageCircle,
  Send,
  ArrowLeft,
  Loader2,
  X,
  Users,
} from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

const TEAL = "#74ddc7";
const PURPLE = "#7401df";

// ---------------------------------------------------------------------------
// Types (strict — no `any`; columns mirror the queries below)
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

/** A row of the PII-safe `profiles_public` view. */
interface PublicProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
  is_internal: boolean | null;
}

/** A folded conversation = the other participant + their last message + unread. */
interface Conversation {
  otherId: string;
  name: string;
  avatar: string | null;
  username: string | null;
  isInternal: boolean;
  lastBody: string;
  lastAt: string;
  /** True when I sent the most recent message (drives the "You: " preview). */
  lastFromMe: boolean;
  unread: number;
}

/** A mutual-follow member offered as a "start a chat" row. */
interface Friend {
  id: string;
  name: string;
  avatar: string | null;
  username: string | null;
  isInternal: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compact relative time ("now", "5m", "3h", "2d", or a date). */
function relTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
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
// Dock
// ---------------------------------------------------------------------------
export function MessengerDock() {
  // Lazy initializer → one stable browser client for this component's lifetime
  // (without reading a ref during render, which the react-hooks rules forbid).
  const [supabase] = useState(() => createClient());

  // Auth: undefined = resolving, null = signed out, string = my id.
  const [meId, setMeId] = useState<string | null | undefined>(undefined);

  // UI state (all toggled from event handlers, never synchronously in effects).
  const [open, setOpen] = useState(false);
  const [activeOtherId, setActiveOtherId] = useState<string | null>(null);

  // List data.
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  // Profile cache so the thread header can render names/avatars/team-flag
  // without an extra fetch.
  const [profiles, setProfiles] = useState<Record<string, PublicProfile>>({});
  const [loadingList, setLoadingList] = useState(true);

  // Thread data.
  const [thread, setThread] = useState<MessageRow[]>([]);
  // Tracks which conversation `thread` currently holds rows for. When it lags
  // behind activeOtherId the thread is (re)loading — derived below instead of
  // toggling a loading flag synchronously inside the effect.
  const [threadLoadedFor, setThreadLoadedFor] = useState<string | null>(null);

  // Compose.
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  // Refetch / poll triggers.
  const [listKey, setListKey] = useState(0);
  const refreshList = useCallback(() => setListKey((k) => k + 1), []);
  const [threadPollKey, setThreadPollKey] = useState(0);

  // Ref mirror of the open conversation so the once-registered realtime
  // callback can tell whether an incoming message belongs to the open thread
  // without re-subscribing on every selection change.
  const activeOtherIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeOtherIdRef.current = activeOtherId;
  }, [activeOtherId]);

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

  // ---- Fetch the conversation list + mutual-follow friends. ----
  // Pure async fetch returns the computed lists + profile map; an `active`
  // guard keeps stale results from landing after unmount / a newer fetch.
  useEffect(() => {
    if (!meId) return;
    let active = true;

    async function load(): Promise<{
      list: Conversation[];
      friendList: Friend[];
      profs: Record<string, PublicProfile>;
    } | null> {
      const me = meId as string;

      // 1) All my messages (newest first), folded into one entry per "other".
      const { data: msgs, error: msgErr } = await supabase
        .from("messages")
        .select("id, sender_id, recipient_id, hub_type, body, read_at, created_at")
        .or(`sender_id.eq.${me},recipient_id.eq.${me}`)
        .order("created_at", { ascending: false });
      if (msgErr) return { list: [], friendList: [], profs: {} };

      const rows = (msgs as MessageRow[] | null) ?? [];
      const byOther = new Map<string, Conversation>();
      for (const m of rows) {
        const other = otherOf(m, me);
        let conv = byOther.get(other);
        if (!conv) {
          conv = {
            otherId: other,
            name: "Member",
            avatar: null,
            username: null,
            isInternal: false,
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

      // 2) "Friends" = members you follow (your contacts). One-directional, so
      // you can start a chat with anyone you've chosen to follow — message-RLS
      // lets you DM any member regardless of whether they follow you back.
      const followingRes = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", me);
      const friendIds = [
        ...new Set(
          ((followingRes.data as { following_id: string }[] | null) ?? [])
            .map((r) => r.following_id)
            .filter((id) => id !== me),
        ),
      ];

      // 3) Resolve profiles for everyone we need to name (chats + friends).
      const ids = [...new Set<string>([...byOther.keys(), ...friendIds])];
      const profs: Record<string, PublicProfile> = {};
      if (ids.length) {
        const { data: pd } = await supabase
          .from("profiles_public")
          .select("id, display_name, avatar_url, username, is_internal")
          .in("id", ids);
        for (const p of (pd as PublicProfile[] | null) ?? []) {
          profs[p.id] = p;
          const conv = byOther.get(p.id);
          if (conv) {
            conv.name = p.display_name || "Member";
            conv.avatar = p.avatar_url;
            conv.username = p.username;
            conv.isInternal = !!p.is_internal;
          }
        }
      }

      const list = [...byOther.values()].sort(
        (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime(),
      );

      // Friends offered as new-chat rows = people you follow NOT already in Chats.
      const friendList: Friend[] = friendIds
        .filter((id) => !byOther.has(id))
        .map((id) => {
          const p = profs[id];
          return {
            id,
            name: p?.display_name || "Member",
            avatar: p?.avatar_url ?? null,
            username: p?.username ?? null,
            isInternal: !!p?.is_internal,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      return { list, friendList, profs };
    }

    load().then((result) => {
      if (!active || !result) return;
      setConversations(result.list);
      setFriends(result.friendList);
      setProfiles((prev) => ({ ...prev, ...result.profs }));
      setLoadingList(false);
    });

    return () => {
      active = false;
    };
  }, [supabase, meId, listKey]);

  // ---- Load the active thread + mark their messages read. ----
  useEffect(() => {
    if (!meId || !activeOtherId) return;
    let active = true;
    const openedId = activeOtherId;

    async function loadThread(): Promise<MessageRow[]> {
      const me = meId as string;
      const other = openedId;
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
  // Covers starting a brand-new thread with someone resolved after this fires.
  useEffect(() => {
    if (!activeOtherId || profiles[activeOtherId]) return;
    let active = true;
    const id = activeOtherId;
    supabase
      .from("profiles_public")
      .select("id, display_name, avatar_url, username, is_internal")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active || !data) return;
        setProfiles((prev) => ({ ...prev, [id]: data as PublicProfile }));
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
      .channel(`dock-dm:${me}`)
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

  // ---- Poll-driven thread refetch (separate from the open/markRead effect so
  // the poll doesn't re-run the read-marking write needlessly). ----
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
  }, [thread.length, activeOtherId, open]);

  // ---- Send a message (optimistic append). ----
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

  // ---- Event handlers (open/close/select). ----
  const openThread = useCallback((otherId: string) => {
    setActiveOtherId(otherId);
    setDraft("");
  }, []);
  const backToList = useCallback(() => {
    setActiveOtherId(null);
  }, []);
  const closeDock = useCallback(() => {
    setOpen(false);
    setActiveOtherId(null);
  }, []);

  // ---- Derived values. ----
  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + c.unread, 0),
    [conversations],
  );

  const activeProfile = activeOtherId ? profiles[activeOtherId] : undefined;
  const activeName = activeProfile?.display_name || "Member";
  const activeInternal = !!activeProfile?.is_internal;
  // The thread accent: staff purple for internal team members, else brand teal.
  const accent = activeInternal ? PURPLE : TEAL;
  // Thread is "loading" while the rows on screen don't yet match the open
  // conversation. Derived (not a state flag toggled in an effect).
  const loadingThread = activeOtherId != null && threadLoadedFor !== activeOtherId;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  // Signed out (or still resolving): render nothing.
  if (!meId) return null;

  // Collapsed launcher.
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open messages"
        className="fixed right-4 bottom-24 z-50 flex h-14 w-14 items-center justify-center rounded-full text-[#0a0a0f] shadow-lg transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2"
        style={{ backgroundColor: TEAL }}
      >
        <MessageCircle className="h-6 w-6" />
        {totalUnread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-card bg-red-500 px-1 text-[10px] font-bold text-white">
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        )}
      </button>
    );
  }

  // Expanded panel.
  return (
    <div className="fixed right-4 bottom-24 z-50 flex h-[70vh] max-h-[560px] w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
      {/* Header */}
      <div
        className="flex items-center gap-2 border-b border-border px-3 py-3"
        style={{ backgroundColor: activeOtherId ? `${accent}1a` : `${TEAL}1a` }}
      >
        {activeOtherId ? (
          <>
            <button
              type="button"
              onClick={backToList}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
              aria-label="Back to chats"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <Avatar
              name={activeName}
              avatar={activeProfile?.avatar_url ?? null}
              size={32}
              accent={accent}
            />
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <p className="truncate text-sm font-bold text-foreground">{activeName}</p>
              {activeInternal && <TeamPill />}
            </div>
          </>
        ) : (
          <>
            <MessageCircle className="h-5 w-5" style={{ color: TEAL }} />
            <p className="flex-1 text-sm font-bold text-foreground">Messages</p>
          </>
        )}
        <button
          type="button"
          onClick={closeDock}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
          aria-label="Close messages"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      {activeOtherId ? (
        // ----------------------------- THREAD -----------------------------
        <>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {loadingThread ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" style={{ color: accent }} />
              </div>
            ) : thread.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                <MessageCircle className="h-8 w-8" style={{ color: accent }} />
                <p className="text-sm">No messages yet — say hello to {activeName}.</p>
              </div>
            ) : (
              thread.map((m) => {
                const mine = m.sender_id === meId;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${
                        mine
                          ? "text-[#0a0a0f]"
                          : "border border-border bg-foreground/[0.04] text-foreground"
                      }`}
                      style={mine ? { backgroundColor: accent } : undefined}
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
            className="flex items-end gap-2 border-t border-border p-2.5"
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
              className="max-h-28 min-h-[2.5rem] flex-1 resize-none rounded-xl border border-border bg-foreground/[0.04] px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-1"
              style={{ ["--tw-ring-color" as string]: accent }}
            />
            <button
              type="submit"
              disabled={sending || draft.trim() === ""}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#0a0a0f] transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: accent }}
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
      ) : (
        // ------------------------------ LIST ------------------------------
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loadingList ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: TEAL }} />
            </div>
          ) : conversations.length === 0 && friends.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Users className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground">No messages yet</p>
              <p className="text-xs text-muted-foreground">
                Follow members from their profiles — once you follow each other you
                can start a direct conversation here.
              </p>
              <Link
                href="/listeners"
                onClick={closeDock}
                className="rounded-full px-4 py-1.5 text-xs font-bold text-[#0a0a0f] transition-opacity hover:opacity-90"
                style={{ backgroundColor: TEAL }}
              >
                Find members
              </Link>
            </div>
          ) : (
            <>
              {/* Chats */}
              {conversations.length > 0 && (
                <>
                  <SectionLabel>Chats</SectionLabel>
                  <ul>
                    {conversations.map((c) => {
                      const preview =
                        c.lastBody === ""
                          ? "Start the conversation"
                          : `${c.lastFromMe ? "You: " : ""}${c.lastBody}`;
                      return (
                        <li key={c.otherId}>
                          <button
                            type="button"
                            onClick={() => openThread(c.otherId)}
                            className="flex w-full items-center gap-3 border-b border-border/60 px-3 py-2.5 text-left transition-colors hover:bg-foreground/[0.04]"
                          >
                            <Avatar
                              name={c.name}
                              avatar={c.avatar}
                              size={40}
                              accent={c.isInternal ? PURPLE : TEAL}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="flex min-w-0 items-center gap-1.5">
                                  <span className="truncate text-sm font-semibold text-foreground">
                                    {c.name}
                                  </span>
                                  {c.isInternal && <TeamPill />}
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
                                    style={{ backgroundColor: c.isInternal ? PURPLE : TEAL }}
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
                </>
              )}

              {/* Friends (mutual follows not already in Chats) */}
              {friends.length > 0 && (
                <>
                  <SectionLabel>Friends</SectionLabel>
                  <ul>
                    {friends.map((f) => (
                      <li key={f.id}>
                        <button
                          type="button"
                          onClick={() => openThread(f.id)}
                          className="flex w-full items-center gap-3 border-b border-border/60 px-3 py-2.5 text-left transition-colors hover:bg-foreground/[0.04]"
                        >
                          <Avatar
                            name={f.name}
                            avatar={f.avatar}
                            size={40}
                            accent={f.isInternal ? PURPLE : TEAL}
                          />
                          <div className="flex min-w-0 flex-1 items-center gap-1.5">
                            <span className="truncate text-sm font-semibold text-foreground">
                              {f.name}
                            </span>
                            {f.isInternal && <TeamPill />}
                            {f.username && (
                              <span className="truncate text-xs text-muted-foreground">
                                @{f.username}
                              </span>
                            )}
                          </div>
                          <Send className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small presentational pieces
// ---------------------------------------------------------------------------
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky top-0 z-10 bg-card px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
      {children}
    </div>
  );
}

/** A tiny purple pill marking internal team members. */
function TeamPill() {
  return (
    <span
      className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wide text-white"
      style={{ backgroundColor: PURPLE }}
    >
      Team
    </span>
  );
}

function Avatar({
  name,
  avatar,
  size,
  accent,
}: {
  name: string;
  avatar: string | null;
  size: number;
  accent: string;
}) {
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border text-[11px] font-semibold"
      style={{
        height: size,
        width: size,
        backgroundColor: `${accent}1a`,
        color: accent,
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

export default MessengerDock;
