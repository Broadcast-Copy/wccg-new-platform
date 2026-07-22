"use client";

import Link from "next/link";
import { Radio, LogOut } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/lib/supabase";

/** Chrome for authed pages: top bar with brand, signed-in email, sign out. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const state = useSession();
  const email = state.status === "authed" ? (state.session.user.email ?? "") : "";

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-line/70 bg-ink/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <Radio className="h-5 w-5 text-signal" aria-hidden />
            Broadcast&nbsp;Copy
            <span className="ml-1 rounded bg-elevated px-1.5 py-0.5 text-[10px] font-medium tracking-wider text-faint uppercase">
              Control
            </span>
          </Link>
          <nav className="hidden items-center gap-5 text-sm text-dim sm:flex">
            <Link href="/" className="transition-colors hover:text-fg">
              Stations
            </Link>
            <Link href="/team" className="transition-colors hover:text-fg">
              Team
            </Link>
          </nav>
          <div className="flex items-center gap-4 text-sm">
            {email && <span className="hidden text-dim sm:inline">{email}</span>}
            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center gap-1.5 text-dim transition hover:text-fg"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>
    </div>
  );
}
