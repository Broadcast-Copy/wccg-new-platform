"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, KeyRound, Loader2, Radio } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PASSWORD_MIN, newPasswordProblem } from "@/lib/password";

/**
 * Set a new password from the e-mailed recovery link, then go to the
 * dashboard already signed in.
 *
 * The link reaches this page in one of three shapes, depending on how the
 * Supabase client and the e-mail template are configured:
 *   #access_token=...&type=recovery   implicit flow (this client's default)
 *   ?code=...                          PKCE flow (same browser only)
 *   ?token_hash=...&type=recovery      a custom template using {{ .TokenHash }}
 * or with #error=... / ?error=... when the link was used or expired.
 *
 * The first two are consumed by the Supabase client itself (detectSessionInUrl)
 * and then scrubbed from the address bar, so the address is read ONCE, when
 * this module is evaluated -- before the client finishes initialising. The
 * form is offered only when the address carried a recovery link (or the client
 * reports PASSWORD_RECOVERY): an ordinary signed-in visit does not get a
 * "change password" form here.
 */

type LinkHint =
  | { kind: "recovery" }
  | { kind: "token_hash"; tokenHash: string }
  | { kind: "error"; message: string }
  | { kind: "none" };

function readLinkHint(): LinkHint {
  if (typeof window === "undefined") return { kind: "none" };
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);
  const error = hash.get("error_description") ?? query.get("error_description") ?? hash.get("error") ?? query.get("error");
  if (error) return { kind: "error", message: error.replace(/\+/g, " ") };
  const tokenHash = query.get("token_hash");
  if (tokenHash && query.get("type") === "recovery") return { kind: "token_hash", tokenHash };
  if (hash.get("type") === "recovery" || hash.has("access_token") || query.has("code")) return { kind: "recovery" };
  return { kind: "none" };
}

/** Captured at module evaluation, before the Supabase client scrubs the URL. */
const INITIAL_HINT: LinkHint = readLinkHint();

type View =
  | { status: "checking" }
  | { status: "invalid"; message: string | null }
  | { status: "ready"; email: string | null }
  | { status: "saving"; email: string | null }
  | { status: "error"; email: string | null; message: string }
  | { status: "done" };

const FIELD =
  "w-full rounded-lg border border-line bg-ink px-3 py-2.5 text-sm text-fg placeholder:text-faint outline-none transition focus:border-signal/60 focus:ring-2 focus:ring-signal/20";
const LABEL = "block text-xs font-medium tracking-wide text-dim uppercase";

export default function Page() {
  const [view, setView] = useState<View>({ status: "checking" });

  useEffect(() => {
    let cancelled = false;

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session && !cancelled) {
        setView((current) =>
          current.status === "checking" || current.status === "invalid"
            ? { status: "ready", email: session.user.email ?? null }
            : current,
        );
      }
    });

    void (async () => {
      const hint = INITIAL_HINT;
      if (hint.kind === "error") {
        if (!cancelled) setView({ status: "invalid", message: hint.message });
        return;
      }
      if (hint.kind === "token_hash") {
        const { data, error } = await supabase.auth.verifyOtp({ token_hash: hint.tokenHash, type: "recovery" });
        if (cancelled) return;
        if (error || !data.session) {
          setView({ status: "invalid", message: error?.message ?? null });
          return;
        }
        setView({ status: "ready", email: data.session.user.email ?? null });
        return;
      }
      // Waits for the client's own initialisation, which exchanges ?code= or
      // reads #access_token= into a session.
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (hint.kind === "recovery" && data.session) {
        setView({ status: "ready", email: data.session.user.email ?? null });
      } else {
        setView((current) => (current.status === "checking" ? { status: "invalid", message: null } : current));
      }
    })();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (view.status !== "ready" && view.status !== "error") return;
    const email = view.email;
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    const confirmation = String(data.get("confirm") ?? "");
    const problem = newPasswordProblem(password, confirmation);
    if (problem) {
      setView({ status: "error", email, message: problem });
      return;
    }
    setView({ status: "saving", email });
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setView({ status: "error", email, message: error.message });
      return;
    }
    // A reset is often a response to a leak: end every OTHER session. Best
    // effort -- the password is already changed either way.
    await supabase.auth.signOut({ scope: "others" }).catch(() => undefined);
    setView({ status: "done" });
    window.location.href = "/";
  }

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Radio className="h-6 w-6 text-signal-ink" aria-hidden />
            Broadcast&nbsp;Copy
            <span className="ml-1 rounded bg-elevated px-1.5 py-0.5 text-[10px] font-medium tracking-wider text-faint uppercase">
              Control
            </span>
          </div>
          <p className="mt-2 text-sm text-dim">Choose a new password.</p>
        </div>

        {view.status === "checking" && (
          <div className="mt-8 grid place-items-center py-10" role="status">
            <Loader2 className="h-6 w-6 animate-spin text-faint" aria-hidden />
            <span className="sr-only">Checking your reset link</span>
          </div>
        )}

        {view.status === "invalid" && (
          <div className="mt-8 rounded-2xl border border-line bg-surface p-6 text-center sm:p-7">
            <AlertCircle className="mx-auto h-10 w-10 text-signal-ink" aria-hidden />
            <h1 className="mt-4 text-xl font-semibold">This link can&rsquo;t be used</h1>
            <p className="mt-2 text-sm text-dim">
              Reset links work once and expire. Open the newest link we sent you, or ask for a new one.
            </p>
            {view.message && <p className="mt-2 text-xs break-words text-faint">{view.message}</p>}
            <Link
              href="/forgot-password"
              className="mt-6 inline-block rounded-lg bg-signal px-5 py-2.5 text-sm font-medium text-fg transition-colors hover:bg-signal-soft"
            >
              Send a new link
            </Link>
          </div>
        )}

        {view.status === "done" && (
          <div className="mt-8 rounded-2xl border border-signal/30 bg-surface p-6 text-center sm:p-7" role="status">
            <CheckCircle2 className="mx-auto h-10 w-10 text-ok" aria-hidden />
            <h1 className="mt-4 text-xl font-semibold">Password changed</h1>
            <p className="mt-2 text-sm text-dim">Taking you to your dashboard…</p>
          </div>
        )}

        {(view.status === "ready" || view.status === "saving" || view.status === "error") && (
          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-4 rounded-2xl border border-line bg-surface p-6 sm:p-7"
            noValidate
          >
            <h1 className="flex items-center gap-2 text-base font-semibold">
              <KeyRound className="h-4 w-4 text-signal-ink" aria-hidden />
              New password
            </h1>
            {view.email && (
              <p className="text-sm break-words text-dim">
                For <span className="text-fg">{view.email}</span>
              </p>
            )}
            {/* Lets password managers file the new password under the right account. */}
            <input type="email" name="username" autoComplete="username" value={view.email ?? ""} readOnly hidden />
            <div className="space-y-1.5">
              <label className={LABEL} htmlFor="password">
                New password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={PASSWORD_MIN}
                className={FIELD}
                aria-describedby="password-hint"
              />
              <p id="password-hint" className="text-xs text-faint">
                At least {PASSWORD_MIN} characters.
              </p>
            </div>
            <div className="space-y-1.5">
              <label className={LABEL} htmlFor="confirm">
                Repeat it
              </label>
              <input id="confirm" name="confirm" type="password" autoComplete="new-password" className={FIELD} />
            </div>

            {view.status === "error" && (
              <p role="alert" className="flex items-start gap-2 text-sm text-signal-ink">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {view.message}
              </p>
            )}

            <button
              type="submit"
              disabled={view.status === "saving"}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-signal px-5 py-3 text-sm font-semibold text-fg transition hover:bg-signal-soft disabled:cursor-not-allowed disabled:opacity-60"
            >
              {view.status === "saving" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {view.status === "saving" ? "Saving…" : "Set password and sign in"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
