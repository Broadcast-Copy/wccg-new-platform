"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Building2, Loader2 } from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { getMyOrganizations } from "@/lib/data";
import { supabase } from "@/lib/supabase";

/**
 * Onboarding: a signed-in user with no organization names one. Creating the org
 * + owner membership needs the SECURITY DEFINER RPC bc_create_org (mig 098),
 * since organizations/organization_members writes are service-role only.
 */

const FIELD =
  "w-full rounded-lg border border-line bg-ink px-3 py-2.5 text-sm text-fg placeholder:text-faint outline-none transition focus:border-signal/60 focus:ring-2 focus:ring-signal/20";
const LABEL = "block text-xs font-medium tracking-wide text-dim uppercase";
const PENDING_ORG_KEY = "bc_pending_org";

type State =
  | { status: "checking" }
  | { status: "ready"; initial: string }
  | { status: "submitting"; initial: string }
  | { status: "error"; initial: string; message: string };

function Welcome() {
  const [state, setState] = useState<State>({ status: "checking" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const orgs = await getMyOrganizations();
      if (cancelled) return;
      if (orgs.length > 0) {
        window.location.href = "/";
        return;
      }
      const initial =
        typeof window !== "undefined"
          ? (window.localStorage.getItem(PENDING_ORG_KEY) ?? "")
          : "";
      setState({ status: "ready", initial });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status === "checking" || state.status === "submitting") return;
    const name = String(new FormData(event.currentTarget).get("org") ?? "").trim();
    if (name === "") {
      setState({ status: "error", initial: state.initial, message: "Organization name required." });
      return;
    }
    setState({ status: "submitting", initial: name });
    const { error } = await supabase.rpc("bc_create_org", { p_name: name });
    if (error) {
      setState({ status: "error", initial: name, message: error.message });
      return;
    }
    if (typeof window !== "undefined") window.localStorage.removeItem(PENDING_ORG_KEY);
    window.location.href = "/";
  }

  if (state.status === "checking") {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-faint" aria-hidden />
      </div>
    );
  }

  const submitting = state.status === "submitting";

  return (
    <div className="mx-auto max-w-md">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-elevated text-signal">
          <Building2 className="h-5 w-5" aria-hidden />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome to Broadcast Copy
        </h1>
      </div>
      <p className="mt-3 text-sm text-dim">
        Name your organization to finish setting up your free account. You&rsquo;ll
        add your first station next.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <label className={LABEL} htmlFor="org">
            Organization name
          </label>
          <input
            id="org"
            name="org"
            className={FIELD}
            defaultValue={state.initial}
            placeholder="Carson Communications"
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
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-signal px-5 py-2.5 text-sm font-semibold text-fg transition-colors hover:bg-signal-soft disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {submitting ? "Creating…" : "Create organization"}
        </button>
      </form>
    </div>
  );
}

export default function Page() {
  return (
    <AuthGuard>
      <AppShell>
        <Welcome />
      </AppShell>
    </AuthGuard>
  );
}
