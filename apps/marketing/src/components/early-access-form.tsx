"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
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

export function EarlyAccessForm() {
  const [state, setState] = useState<FormState>({ status: "idle" });

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

    const email = read("email");
    if (!email.includes("@")) {
      setState({ status: "error", message: "Enter a valid email address." });
      return;
    }

    setState({ status: "submitting" });

    const stationCountRaw = read("station_count");
    const stationCount = Number.parseInt(stationCountRaw, 10);

    const { error } = await supabase.from("bc_leads").insert({
      name: read("name") || null,
      email,
      organization: read("organization") || null,
      call_sign: read("call_sign") || null,
      band: read("band") || null,
      station_count: Number.isFinite(stationCount) ? stationCount : null,
      market: read("market") || null,
      message: read("message") || null,
      source: "landing",
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

  if (state.status === "success") {
    return (
      <div className="rounded-2xl border border-signal/30 bg-elevated p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-signal" aria-hidden />
        <h3 className="mt-4 text-xl font-semibold">You&rsquo;re on the list.</h3>
        <p className="mt-2 text-sm text-dim">
          We&rsquo;ll reach out personally to schedule your station walkthrough —
          usually within one business day.
        </p>
      </div>
    );
  }

  const submitting = state.status === "submitting";

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className={LABEL} htmlFor="name">
            Your name
          </label>
          <input id="name" name="name" className={FIELD} placeholder="Jane Carson" autoComplete="name" />
        </div>
        <div className="space-y-1.5">
          <label className={LABEL} htmlFor="email">
            Work email <span className="text-signal">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className={FIELD}
            placeholder="gm@yourstation.com"
            autoComplete="email"
          />
        </div>
        <div className="space-y-1.5">
          <label className={LABEL} htmlFor="organization">
            Organization
          </label>
          <input id="organization" name="organization" className={FIELD} placeholder="Carson Communications" />
        </div>
        <div className="space-y-1.5">
          <label className={LABEL} htmlFor="call_sign">
            Call sign
          </label>
          <input id="call_sign" name="call_sign" className={FIELD} placeholder="WCCG" />
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
          <label className={LABEL} htmlFor="station_count">
            Stations you operate
          </label>
          <input
            id="station_count"
            name="station_count"
            type="number"
            min={1}
            className={FIELD}
            placeholder="1"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className={LABEL} htmlFor="market">
          Market
        </label>
        <input id="market" name="market" className={FIELD} placeholder="Fayetteville, NC" />
      </div>

      <div className="space-y-1.5">
        <label className={LABEL} htmlFor="message">
          What are you trying to fix?
        </label>
        <textarea
          id="message"
          name="message"
          rows={3}
          className={FIELD}
          placeholder="We're running three stations on spreadsheets and a legacy CMS…"
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
        {submitting ? "Sending…" : "Request early access"}
      </button>

      <p className="text-center text-xs text-faint">
        No card required. We&rsquo;ll only use this to talk to you about your station.
      </p>
    </form>
  );
}
