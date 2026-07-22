"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useSession } from "@/hooks/use-session";

/**
 * Wrap any authed page. While the session resolves we show a spinner; if the
 * visitor is anonymous we bounce to /login. Client-side only — this is a static
 * export with client-held sessions, so there is no server redirect.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const state = useSession();

  useEffect(() => {
    if (state.status === "anon") window.location.href = "/login";
  }, [state.status]);

  if (state.status !== "authed") {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-faint" aria-hidden />
      </div>
    );
  }

  return <>{children}</>;
}
