"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

/** Auth state as a discriminated union — no isLoading/isAuthed boolean soup. */
export type SessionState =
  | { status: "loading" }
  | { status: "authed"; session: Session }
  | { status: "anon" };

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setState(
        data.session
          ? { status: "authed", session: data.session }
          : { status: "anon" },
      );
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(session ? { status: "authed", session } : { status: "anon" });
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
