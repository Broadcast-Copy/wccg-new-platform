"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import type { User, Session } from "@supabase/supabase-js";
import { setPointsUserEmail } from "@/hooks/use-listening-points";
import { setHistoryUserEmail } from "@/lib/listening-history";
import { seedUserPoints } from "@/lib/seed-user-points";

/**
 * Hook to access the current Supabase auth state.
 *
 * Subscribes to auth state changes and provides the current user,
 * session, loading state, and a signOut function.
 * Also syncs user email to points and history localStorage keys.
 */
export function useAuth() {
  const { supabase } = useSupabase();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get the initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      // Sync email to points & history storage
      const email = session?.user?.email ?? null;
      setPointsUserEmail(email);
      setHistoryUserEmail(email);
      // Seed demo user data (idempotent — only runs once)
      seedUserPoints();
      setIsLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      // Sync email to points & history storage
      const email = session?.user?.email ?? null;
      setPointsUserEmail(email);
      setHistoryUserEmail(email);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return { user, session, isLoading, signOut };
}
