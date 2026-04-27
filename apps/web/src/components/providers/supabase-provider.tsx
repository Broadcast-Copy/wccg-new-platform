"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { startPointsAutoFlusher } from "@/lib/points-sync";

type SupabaseContext = {
  supabase: SupabaseClient;
};

const Context = createContext<SupabaseContext | undefined>(undefined);

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => {
    // Use placeholder URL/key when env is missing so static export
    // prerendering doesn't crash. Runtime queries will fail with a clear
    // "no project configured" error from Supabase, which is a much better
    // failure mode than blowing up the whole build.
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL && typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.warn("[supabase] NEXT_PUBLIC_SUPABASE_URL is unset — using placeholder client");
    }
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
