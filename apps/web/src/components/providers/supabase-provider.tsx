"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { startPointsAutoFlusher } from "@/lib/points-sync";

type SupabaseContext = {
  supabase: SupabaseClient;
};

const Context = createContext<SupabaseContext | undefined>(undefined);

// Public-by-design fallbacks (project URL + sb_publishable_* key, both
// protected by RLS). Real values so the app works even when the build env
// lacks NEXT_PUBLIC_SUPABASE_* — previously these defaulted to a
// non-existent placeholder domain, which is why login threw "Failed to
// fetch" in production.
const FALLBACK_SUPABASE_URL = "https://irjiqbmoohklagdegezz.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY = "sb_publishable_w9EytFGBM7mEvefmGhsZ9w_bXbmNjQ4";

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;
    return createBrowserClient(url, key);
  }, []);

  // A2 — kick off the points outbox flusher as soon as the app boots.
  // Idempotent; safe to call once. Drains background-earned points to the
  // server-side ledger so balance survives across devices and feeds the
  // leaderboard / marketplace.
  useEffect(() => {
    startPointsAutoFlusher();
  }, []);

  return (
    <Context.Provider value={{ supabase }}>
      {children}
    </Context.Provider>
  );
}

export function useSupabase() {
  const context = useContext(Context);
  if (context === undefined) {
    throw new Error("useSupabase must be used inside SupabaseProvider");
  }
  return context;
}
