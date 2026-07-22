"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2, Radio } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/use-session";

/** Free account creation. The paid unit is a station, so signup itself is open. */

const FIELD =
  "w-full rounded-lg border border-line bg-ink px-3 py-2.5 text-sm text-fg placeholder:text-faint outline-none transition focus:border-signal/60 focus:ring-2 focus:ring-signal/20";
const LABEL = "block text-xs font-medium tracking-wide text-dim uppercase";
const PENDING_ORG_KEY = "bc_pending_org";

type FormState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; message: string }
  | { status: "confirm"; org: string };

export default function Page() {
  const session = useSession();
  const [state, setState] = useState<FormState>({ status: "idle" });

  useEffect(() => {
    if (session.status === "authed") window.location.href = "/";
  }, [session.status]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status === "submitting") return;
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const org = String(data.get("org") ?? "").trim();

    if (!email.includes("@") || password.length < 6 || org === "") {
      setState({
        status: "error",
        message: "Enter a valid email, a 6+ character password, and an organization name.",
      });
      return;
    }

    setState({ status: "submitting" });
    const { data: signUp, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setState({ status: "error", message: error.message });
      return;
    }

    // Email confirmation OFF → we already have a session, create the org now.
    if (signUp.session !== null) {
      const { error: orgError } = await supabase.rpc("bc_create_org", { p_name: org });
      if (orgError) {
        setState({ status: "error", message: orgError.message });
        return;
      }
      window.location.href = "/";
      return;
    }

    // Email confirmation ON → stash the org name for /welcome after they confirm.
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PENDING_ORG_KEY, org);
    }
    setState({ status: "confirm", org });
  }

  const submitting = state.status === "submitting";

  return (
    <div className="grid min-h-screen place-items-center bg-ink px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2 font-semibold tracking-tight">
          <Radio className="h-5 w-5 text-signal" aria-hidden />
          Broadcast&nbsp;Copy
          <span className="ml-1 rounded bg-elevated px-1.5 py-0.5 text-[10px] font-medium tracking-wider text-faint uppercase">
            Control
          </span>
        </div>

        {state.status === "confirm" ? (
          <div className="rounded-2xl border border-signal/30 bg-surface p-8 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-signal" aria-hidden />
            <h1 className="mt-4 text-xl font-semibold">Check your email</h1>
            <p className="mt-2 text-sm text-dim">
              Confirm your account, then sign in — we&rsquo;ll finish setting up{" "}
              <span className="text-fg">{state.org}</span>.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block rounded-lg bg-signal px-5 py-2.5 text-sm font-medium text-fg transition-colors hover:bg-signal-soft"
            >
              Go to sign in
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
            <h1 className="text-xl font-semibold">Create your account</h1>
            <p className="mt-1 text-sm text-dim">
              Free to start. Add a station when you&rsquo;re ready.
            </p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
              <div className="space-y-1.5">
                <label className={LABEL} htmlFor="email">
                  Work email
                </label>
                <input id="email" name="email" type="email" autoComplete="email" className={FIELD} placeholder="gm@yourstation.com" />
              </div>
              <div className="space-y-1.5">
                <label className={LABEL} htmlFor="password">
                  Password
                </label>
                <input id="password" name="password" type="password" autoComplete="new-password" className={FIELD} placeholder="At least 6 characters" />
              </div>
              <div className="space-y-1.5">
                <label className={LABEL} htmlFor="org">
                  Organization name
                </label>
                <input id="org" name="org" className={FIELD} placeholder="Carson Communications" />
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
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-signal px-5 py-3 text-sm font-semibold text-fg transition-colors hover:bg-signal-soft disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {submitting ? "Creating…" : "Create account"}
              </button>
            </form>
            <p className="mt-5 text-center text-sm text-dim">
              Already have an account?{" "}
              <Link href="/login" className="text-signal-soft hover:text-signal">
                Sign in
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
