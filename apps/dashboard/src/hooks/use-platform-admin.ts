"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Whether the signed-in account is a platform admin, for SHOWING admin
 * affordances (the Admin link in the app shell) and nothing else. The database
 * is the guard: every back-office read and write re-checks is_platform_admin()
 * itself (migrations 115-118), so a wrong answer here only hides or shows a
 * link.
 *
 * Asked once per user id. False while unknown, on any error, and when signed
 * out -- the link appears only after the database says yes. The answer is
 * tagged with the user it is for, so switching accounts never shows the
 * previous account's answer, and no state is set synchronously in the effect.
 */
export function useIsPlatformAdmin(userId: string | null): boolean {
  const [answer, setAnswer] = useState<{ userId: string; admin: boolean } | null>(null);

  useEffect(() => {
    if (userId === null) return;
    let cancelled = false;
    supabase.rpc("is_platform_admin").then(
      ({ data, error }) => {
        if (!cancelled) setAnswer({ userId, admin: !error && data === true });
      },
      () => {
        if (!cancelled) setAnswer({ userId, admin: false });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return userId !== null && answer !== null && answer.userId === userId && answer.admin;
}
