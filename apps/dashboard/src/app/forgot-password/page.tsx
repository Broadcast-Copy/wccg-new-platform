"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Loader2, MailCheck, Radio } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { resetRedirectUrl } from "@/lib/auth-urls";

/**
 * Ask for a password-reset e-mail.
 *
 * NEVER reveals whether an account exists. Supabase answers an unknown
 * address with success and sends nothing; for a known address it can fail
 * (e.g. while its SMTP credential is broken, "Error sending recovery email").
 * Showing that error would tell a stranger the address has an account, so
 * every answer from the server gets the same message. Only a request that
 * never reached the server is reported as such -- that says nothing about
 * any address.
 */

type FormState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "invalid"; message: string }
  | { status: "offline" }
  | { status: "sent"; email: string };

const FIELD =
  "w-full rounded-lg border border-line bg-ink px-3 py-2.5 text-sm text-fg placeholder:text-faint outline-none transition focus:border-signal/60 focus:ring-2 focus:ring-signal/20";
const LABEL = "block text-xs font-medium tracking-wide text-dim uppercase";

export default function Page() {
  const [state, setState] = useState<FormState>({ status: "idle" });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status === "submitting") return;
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setState({ status: "invalid", message: "Enter the e-mail address you sign in with." });
      return;
    }
    setState({ status: "submitting" });
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: resetRedirectUrl() });
      if (error && error.name === "AuthRetryableFetchError") {
        setState({ status: "offline" });
        return;
      }
      // Any other outcome, success or not, looks identical (see above).
      setState({ status: "sent", email });
    } catch {
      setState({ status: "offline" });
    }
  }

  const submitting = state.status === "submitting";

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
          <p className="mt-2 text-sm text-dim">Reset your password.</p>
        </div>

        {state.status === "sent" ? (
          <div className="mt-8 rounded-2xl border border-signal/30 bg-surface p-6 text-center sm:p-7" role="status">
            <MailCheck className="mx-auto h-10 w-10 text-signal-ink" aria-hidden />
            <h1 className="mt-4 text-xl font-semibold">Check your e-mail</h1>
            <p className="mt-2 text-sm break-words text-dim">
              If <span className="text-fg">{state.email}</span> has a Broadcast Copy account, a link to set a new
              password is on its way. It works once, and only for a limited time.
            </p>
            <p className="mt-3 text-xs text-faint">
              Nothing after a few minutes? Check spam, then try again or write to hello@broadcastcopy.ai.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block rounded-lg bg-signal px-5 py-2.5 text-sm font-medium text-fg transition-colors hover:bg-signal-soft"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-4 rounded-2xl border border-line bg-surface p-6 sm:p-7"
            noValidate
          >
            <h1 className="text-base font-semibold">Forgot your password?</h1>
            <p className="text-sm text-dim">Enter your e-mail and we&rsquo;ll send you a link to choose a new one.</p>
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
                className={FIELD}
                placeholder="gm@yourstation.com"
                aria-invalid={state.status === "invalid"}
                aria-describedby={state.status === "invalid" ? "email-error" : undefined}
              />
            </div>

            {state.status === "invalid" && (
              <p id="email-error" role="alert" className="flex items-start gap-2 text-sm text-signal-ink">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {state.message}
              </p>
            )}
            {state.status === "offline" && (
              <p role="alert" className="flex items-start gap-2 text-sm text-signal-ink">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                Could not reach the server. Check your connection and try again.
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-signal px-5 py-3 text-sm font-semibold text-fg transition hover:bg-signal-soft disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {submitting ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center">
          <Link href="/login" className="inline-flex items-center gap-1 text-sm text-dim transition hover:text-fg">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
