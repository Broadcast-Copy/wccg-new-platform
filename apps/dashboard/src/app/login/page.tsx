"use client";

import { useEffect, useState } from "react";
import { Radio, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/use-session";

/** Illegal states unrepresentable — no isLoading/isError boolean soup. */
type FormState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; message: string };

const FIELD =
  "w-full rounded-lg border border-line bg-ink px-3 py-2.5 text-sm text-fg placeholder:text-faint outline-none transition focus:border-signal/60 focus:ring-2 focus:ring-signal/20";
const LABEL = "block text-xs font-medium tracking-wide text-dim uppercase";

export default function LoginPage() {
  const session = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<FormState>({ status: "idle" });

  // Already signed in? Bounce to the cockpit. Client-side only — this is a
  // static export with client-held sessions, so there is no server redirect.
  useEffect(() => {
    if (session.status === "authed") window.location.href = "/";
  }, [session.status]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status === "submitting") return;

    setState({ status: "submitting" });

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setState({ status: "error", message: error.message });
        return;
      }
      // Success — full navigation so the session is re-read on the next page.
      window.location.href = "/";
    } catch (err: unknown) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Something went wrong. Please try again.",
      });
    }
  }

  // Redirect in flight — mirror the AuthGuard spinner instead of flashing the form.
  if (session.status === "authed") {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-faint" aria-hidden />
      </div>
    );
  }

  const submitting = state.status === "submitting";

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Radio className="h-6 w-6 text-signal" aria-hidden />
            Broadcast&nbsp;Copy
            <span className="ml-1 rounded bg-elevated px-1.5 py-0.5 text-[10px] font-medium tracking-wider text-faint uppercase">
              Control
            </span>
          </div>
          <p className="mt-2 text-sm text-dim">Sign in to your control plane.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-4 rounded-2xl border border-line bg-surface p-6 sm:p-7"
          noValidate
        >
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={FIELD}
              placeholder="gm@yourstation.com"
            />
          </div>

          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={FIELD}
              placeholder="••••••••"
            />
          </div>

          {state.status === "error" && (
            <p className="flex items-start gap-2 text-sm text-signal-soft">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {state.message}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-signal px-5 py-3 text-sm font-semibold text-white transition hover:bg-signal-soft disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-dim">
          New to Broadcast Copy?{" "}
          <a href="/signup" className="text-signal-soft transition hover:text-signal">
            Create an account
          </a>
        </p>

        <p className="mt-6 text-center">
          <a
            href="https://broadcastcopy.ai"
            className="text-xs text-faint transition hover:text-dim"
          >
            ← broadcastcopy.ai
          </a>
        </p>
      </div>
    </main>
  );
}
