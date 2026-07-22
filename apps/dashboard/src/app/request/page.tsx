"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/lib/supabase";

const BANDS = ["FM", "AM", "FM + AM", "Online only"] as const;
type Band = (typeof BANDS)[number];

/** Illegal states unrepresentable — no isLoading/isError boolean soup. */
type FormState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; message: string }
  | { status: "success" };

const FIELD =
  "w-full rounded-lg border border-line bg-ink px-3 py-2.5 text-sm text-fg placeholder:text-faint outline-none transition focus:border-signal/60 focus:ring-2 focus:ring-signal/20";
const LABEL = "block text-xs font-medium tracking-wide text-dim uppercase";

function RequestStationForm() {
  const [state, setState] = useState<FormState>({ status: "idle" });
  const session = useSession();
  // Contact email is the signed-in user — prefilled and locked (read-only).
  const email = session.status === "authed" ? (session.session.user.email ?? "") : "";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status === "submitting") return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const read = (key: string): string => String(data.get(key) ?? "").trim();

    // Honeypot — real people leave this hidden field empty.
    if (read("company_website") !== "") {
      setState({ status: "success" });
      return;
    }

    // Email comes from the session, not the form (the field is locked).
    if (!email.includes("@")) {
      setState({ status: "error", message: "We couldn't read your account email. Try signing in again." });
      return;
    }

    const stationName = read("station_name");
    if (stationName === "") {
      setState({ status: "error", message: "Enter the station name." });
      return;
    }

    const callSign = read("call_sign");
    if (callSign === "") {
      setState({ status: "error", message: "Enter the call sign." });
      return;
    }

    setState({ status: "submitting" });

    const { error } = await supabase.from("bc_leads").insert({
      // No contact-name field on this form — the station name identifies the
      // request, and the signed-in email is the fallback name.
      name: stationName || email,
      email,
      organization: null,
      call_sign: callSign,
      band: read("band") || null,
      market: read("market") || null,
      message: read("message") || null,
      source: "dashboard",
    });

    if (error) {
      setState({
        status: "error",
        message: "Something went wrong. Email hello@broadcastcopy.ai and we'll sort it.",
      });
      return;
    }

    form.reset();
    setState({ status: "success" });
  }

  const submitting = state.status === "submitting";

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-dim transition hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to your stations
      </Link>

      <h1 className="mt-6 text-2xl font-semibold tracking-tight">Request a station</h1>
      <p className="mt-2 text-sm text-dim">
        New stations are onboarded white-glove. Tell us about the station below and
        someone from our team will follow up to get it wired into your control plane.
      </p>

      {state.status === "success" ? (
        <div className="mt-8 rounded-2xl border border-signal/30 bg-elevated p-8 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-signal" aria-hidden />
          <h2 className="mt-4 text-xl font-semibold">Request received — we&rsquo;ll be in touch.</h2>
          <p className="mt-2 text-sm text-dim">
            We&rsquo;ll reach out at <span className="text-fg">{email}</span> to schedule
            your station walkthrough — usually within one business day.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-1.5 text-sm text-signal transition hover:text-signal-soft"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to your stations
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="email">
              Contact email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              readOnly
              aria-readonly
              className={`${FIELD} cursor-not-allowed text-dim`}
              placeholder="Loading your account…"
            />
            <p className="text-xs text-faint">We&rsquo;ll follow up here. Signed in as this account.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className={LABEL} htmlFor="station_name">
                Station name <span className="text-signal">*</span>
              </label>
              <input
                id="station_name"
                name="station_name"
                required
                className={FIELD}
                placeholder="Cool 105.1 FM"
              />
            </div>
            <div className="space-y-1.5">
              <label className={LABEL} htmlFor="call_sign">
                Call sign <span className="text-signal">*</span>
              </label>
              <input
                id="call_sign"
                name="call_sign"
                required
                className={FIELD}
                placeholder="WCCG"
              />
            </div>
            <div className="space-y-1.5">
              <label className={LABEL} htmlFor="band">
                Band
              </label>
              <select id="band" name="band" className={FIELD} defaultValue="">
                <option value="">Select…</option>
                {BANDS.map((band: Band) => (
                  <option key={band} value={band}>
                    {band}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className={LABEL} htmlFor="market">
                Market
              </label>
              <input id="market" name="market" className={FIELD} placeholder="Fayetteville, NC" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="message">
              Tell us about this station
            </label>
            <textarea
              id="message"
              name="message"
              rows={4}
              className={FIELD}
              placeholder="Format, ownership, what you're running today, and what you want out of Broadcast Copy…"
            />
          </div>

          {/* Honeypot — visually hidden, not display:none, so bots still fill it. */}
          <div className="absolute left-[-9999px]" aria-hidden>
            <label htmlFor="company_website">Company website</label>
            <input id="company_website" name="company_website" tabIndex={-1} autoComplete="off" />
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
            {submitting ? "Submitting…" : "Submit request"}
          </button>

          <p className="text-center text-xs text-faint">
            No card required. We&rsquo;ll only use this to get your station set up.
          </p>
        </form>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <AuthGuard>
      <AppShell>
        <RequestStationForm />
      </AppShell>
    </AuthGuard>
  );
}
