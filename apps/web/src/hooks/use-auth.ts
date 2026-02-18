"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import type { User } from "@supabase/supabase-js";

/**
 * Hook to access the current Supabase auth state.
 *
 * Subscribes to auth state changes and provides the current user,
 * loading state, and a signOut function.
 */
export function useAuth() {
  const { supabase } = useSupabase();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get the initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setIsLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return { user, isLoading, signOut };
}
