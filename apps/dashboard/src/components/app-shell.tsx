"use client";

import Link from "next/link";
import { Radio, LogOut, ShieldCheck } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { useIsPlatformAdmin } from "@/hooks/use-platform-admin";
import { supabase } from "@/lib/supabase";

/**
 * Chrome for authed pages: top bar with brand, signed-in email, sign out, and
 * an Admin link for platform admins only. The link is a convenience: /admin
 * checks again, and the database refuses every admin call from anyone else.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const state = useSession();
  const email = state.status === "authed" ? (state.session.user.email ?? "") : "";
  const isAdmin = useIsPlatformAdmin(state.status === "authed" ? state.session.user.id : null);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-line/70 bg-ink/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <Radio className="h-5 w-5 text-signal-ink" aria-hidden />
            Broadcast&nbsp;Copy
            <span className="ml-1 rounded bg-elevated px-1.5 py-0.5 text-[10px] font-medium tracking-wider text-faint uppercase">
              Control
            </span>
          </Link>
          <nav className="hidden items-center gap-4 text-sm text-dim sm:flex lg:gap-5">
            <Link href="/" className="transition-colors hover:text-fg">
              Stations
            </Link>
            <Link href="/fleet" className="transition-colors hover:text-fg">
              Fleet
            </Link>
            <Link href="/team" className="transition-colors hover:text-fg">
              Team
            </Link>
            <Link href="/settings" className="transition-colors hover:text-fg">
              Settings
            </Link>
            <Link href="/compliance" className="transition-colors hover:text-fg">
              Compliance
            </Link>
            <Link href="/docs" className="transition-colors hover:text-fg">
              Docs
            </Link>
          </nav>
          <div className="flex items-center gap-4 text-sm">
            {isAdmin && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 font-medium text-signal-ink transition hover:text-fg"
              >
                <ShieldCheck className="h-4 w-4" aria-hidden />
                <span className="sr-only sm:not-sr-only">Admin</span>
              </Link>
            )}
            {email && <span className="hidden max-w-[16rem] truncate text-dim lg:inline">{email}</span>}
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
