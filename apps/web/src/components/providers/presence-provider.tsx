"use client";

/**
 * PresenceProvider — site-wide "who's online now" via Supabase Realtime Presence.
 *
 * Every signed-in user joins one shared presence channel keyed by their user id.
 * `presenceState()` is then keyed by user id, so the set of online users is just
 * `Object.keys(state)`. No table, no heartbeat, no DB writes — presence is
 * ephemeral and accurate to the moment. Consumers read it via `useOnlinePresence`.
 *
 * Mounted inside (main)/layout so it covers the authenticated app (members,
 * profiles, the messenger dock). honors react-hooks/set-state-in-effect: the only
 * setState calls happen in the Realtime `sync` callback or a deferred microtask —
 * never synchronously in the effect body.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useAuth } from "@/hooks/use-auth";

interface PresenceValue {
  /** User ids currently online (signed in + connected somewhere in the app). */
  onlineIds: ReadonlySet<string>;
  /** Convenience predicate; false for null/undefined. */
  isOnline: (userId: string | null | undefined) => boolean;
}

const PresenceContext = createContext<PresenceValue>({
  onlineIds: new Set<string>(),
  isOnline: () => false,
});

const PRESENCE_CHANNEL = "wccg-presence";

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [onlineIds, setOnlineIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let active = true;

    // Signed out: drop any stale presence (deferred so we never setState
    // synchronously inside the effect body).
    if (!userId) {
      queueMicrotask(() => {
        if (active) setOnlineIds(new Set());
      });
      return () => {
        active = false;
      };
    }

    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: { presence: { key: userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        if (!active) return;
        // Keys are the per-user presence keys we set below.
        setOnlineIds(new Set(Object.keys(channel.presenceState())));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  const value = useMemo<PresenceValue>(
    () => ({
      onlineIds,
      isOnline: (id) => (!!id && onlineIds.has(id)),
    }),
    [onlineIds],
  );

  return (
    <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>
  );
}

export function useOnlinePresence(): PresenceValue {
  return useContext(PresenceContext);
}
