"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2, Radio } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/use-session";

type Preview = {
  org_name: string;
  role: string;
  email: string;
  status: string;
  valid: boolean;
};

type LoadState =
  | { status: "loading" }
  | { status: "invalid"; message: string }
  | { status: "ready"; preview: Preview };

type AcceptState =
  | { status: "idle" }
  | { status: "accepting" }
  | { status: "error"; message: string };

function Accept() {
  const token = useSearchParams().get("token");
  const session = useSession();
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [accept, setAccept] = useState<AcceptState>({ status: "idle" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (token === null || token === "") {
        if (!cancelled)
          setLoad({ status: "invalid", message: "This invite link is missing its token." });
        return;
      }
      const { data, error } = await supabase.rpc("bc_invite_preview", { p_token: token });
      if (cancelled) return;
      const row = Array.isArray(data) ? (data[0] as Preview | undefined) : undefined;
      if (error || row === undefined) {
        setLoad({ status: "invalid", message: "This invite could not be found." });
        return;
      }
      if (!row.valid) {
        setLoad({
          status: "invalid",
          message: row.status === "pending" ? "This invite has expired." : `This invite was ${row.status}.`,
        });
        return;
      }
      setLoad({ status: "ready", preview: row });
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleAccept() {
    if (token === null || accept.status === "accepting") return;
    setAccept({ status: "accepting" });
    const { error } = await supabase.rpc("bc_accept_invite", { p_token: token });
    if (error) {
      setAccept({ status: "error", message: error.message });
      return;
    }
    window.location.href = "/";
  }

  if (load.status === "loading") {
    return (
      <div className="grid place-items-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-faint" aria-hidden />
      </div>
    );
  }

  if (load.status === "invalid") {
    return (
      <div className="rounded-2xl border border-line bg-surface p-8 text-center">
        <AlertCircle className="mx-auto h-9 w-9 text-amber" aria-hidden />
        <h1 className="mt-4 text-lg font-semibold">Invite unavailable</h1>
        <p className="mt-2 text-sm text-dim">{load.message}</p>
        <a
          href="https://broadcastcopy.ai"
          className="mt-6 inline-block text-sm text-signal-soft transition hover:text-signal"
        >
          broadcastcopy.ai
        </a>
      </div>
    );
  }

  const { preview } = load;

  return (
    <div className="rounded-2xl border border-line bg-surface p-6 text-center sm:p-8">
      <CheckCircle2 className="mx-auto h-9 w-9 text-signal" aria-hidden />
      <h1 className="mt-4 text-lg font-semibold">
        You&rsquo;re invited to {preview.org_name}
      </h1>
      <p className="mt-2 text-sm text-dim">
        Role: <span className="text-fg capitalize">{preview.role}</span> · for{" "}
        <span className="text-fg">{preview.email}</span>
      </p>

      {session.status === "authed" ? (
        <>
          <button
            type="button"
            onClick={handleAccept}
            disabled={accept.status === "accepting"}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-signal px-5 py-3 text-sm font-semibold text-fg transition-colors hover:bg-signal-soft disabled:opacity-60"
          >
            {accept.status === "accepting" && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            )}
            {accept.status === "accepting" ? "Joining…" : "Accept invitation"}
          </button>
          {accept.status === "error" && (
            <p className="mt-3 flex items-start gap-2 text-left text-sm text-signal-soft">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {accept.message}
            </p>
          )}
        </>
      ) : (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-dim">
            Sign in as <span className="text-fg">{preview.email}</span> to accept.
          </p>
          <div className="flex gap-2">
            <Link
              href="/login"
              className="flex-1 rounded-lg bg-signal px-4 py-2.5 text-sm font-semibold text-fg transition-colors hover:bg-signal-soft"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="flex-1 rounded-lg border border-line px-4 py-2.5 text-sm font-medium transition-colors hover:bg-elevated"
            >
              Create account
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <div className="grid min-h-screen place-items-center bg-ink px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2 font-semibold tracking-tight">
          <Radio className="h-5 w-5 text-signal" aria-hidden />
          Broadcast&nbsp;Copy
        </div>
        <Suspense
          fallback={
            <div className="grid place-items-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-faint" aria-hidden />
            </div>
          }
        >
          <Accept />
        </Suspense>
      </div>
    </div>
  );
}
