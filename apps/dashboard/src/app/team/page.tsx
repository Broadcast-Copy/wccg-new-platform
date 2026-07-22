"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  Copy,
  Loader2,
  Plus,
  Users,
  X,
} from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { getMyOrganizations } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/use-session";
import type { Organization } from "@/lib/types";
import { cx } from "@/lib/format";

/**
 * Team roster + invites. The roster comes from bc_org_team (RLS only exposes
 * your own membership row); invites go through bc_invite_member / bc_list_invites
 * / bc_revoke_invite, all gated to owner/gm in the DB (migration 099). Email
 * delivery isn't wired (Resend unverified), so we surface a copyable link.
 */

type TeamMember = {
  user_id: string;
  role: string;
  display_name: string | null;
  email: string | null;
  joined_at: string;
};

type Invite = {
  id: string;
  org_id: string;
  email: string;
  role: string;
  token: string;
  status: string;
  created_at: string;
  expires_at: string;
};

type OrgTeam = {
  org: Organization;
  members: TeamMember[];
  myRole: string | null;
  invites: Invite[];
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; teams: OrgTeam[] };

const INVITE_ROLES = ["gm", "om", "billing", "staff"] as const;

const ROLE_STYLE = new Map<string, string>([
  ["owner", "bg-signal/15 text-signal-soft"],
  ["gm", "bg-amber/15 text-amber"],
  ["om", "bg-amber/15 text-amber"],
  ["billing", "bg-elevated text-dim"],
]);

function roleClass(role: string): string {
  return ROLE_STYLE.get(role) ?? "bg-elevated text-faint";
}

const FIELD =
  "w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm text-fg placeholder:text-faint outline-none transition focus:border-signal/60 focus:ring-2 focus:ring-signal/20";

type InviteFormState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; message: string };

function InvitePanel({
  orgId,
  initialInvites,
}: {
  orgId: string;
  initialInvites: Invite[];
}) {
  const [invites, setInvites] = useState<Invite[]>(initialInvites);
  const [state, setState] = useState<InviteFormState>({ status: "idle" });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status === "submitting") return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") ?? "").trim();
    const role = String(data.get("role") ?? "staff");
    if (!email.includes("@")) {
      setState({ status: "error", message: "Enter a valid email." });
      return;
    }
    setState({ status: "submitting" });
    const { data: row, error } = await supabase.rpc("bc_invite_member", {
      p_org_id: orgId,
      p_email: email,
      p_role: role,
    });
    if (error) {
      setState({
        status: "error",
        message: error.code === "42501" ? "Only owners and GMs can invite." : error.message,
      });
      return;
    }
    if (row !== null) setInvites((prev) => [row as Invite, ...prev]);
    form.reset();
    setState({ status: "idle" });
  }

  async function copyLink(invite: Invite) {
    if (typeof window === "undefined") return;
    const link = `${window.location.origin}/accept?token=${invite.token}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(invite.id);
      window.setTimeout(() => setCopiedId(null), 1500);
    } catch {
      /* clipboard blocked — no-op */
    }
  }

  async function revoke(id: string) {
    const { error } = await supabase.rpc("bc_revoke_invite", { p_invite_id: id });
    if (!error) setInvites((prev) => prev.filter((invite) => invite.id !== id));
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <h3 className="text-sm font-medium tracking-wider text-faint uppercase">
        Invite a teammate
      </h3>
      <form onSubmit={handleInvite} className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-[12rem] flex-1">
          <input name="email" type="email" className={FIELD} placeholder="teammate@station.com" />
        </div>
        <select name="role" defaultValue="staff" className={cx(FIELD, "w-auto")}>
          {INVITE_ROLES.map((role) => (
            <option key={role} value={role}>
              {role.toUpperCase()}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={state.status === "submitting"}
          className="inline-flex items-center gap-1.5 rounded-lg bg-signal px-3 py-2 text-sm font-medium text-fg transition-colors hover:bg-signal-soft disabled:opacity-60"
        >
          {state.status === "submitting" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Plus className="h-4 w-4" aria-hidden />
          )}
          Invite
        </button>
      </form>

      {state.status === "error" && (
        <p className="mt-2 flex items-start gap-2 text-sm text-signal-soft">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {state.message}
        </p>
      )}

      {invites.length > 0 && (
        <ul className="mt-4 space-y-2">
          {invites.map((invite) => (
            <li
              key={invite.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-ink px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <span className="truncate text-fg">{invite.email}</span>
                <span className="ml-2 text-xs text-faint uppercase">{invite.role}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => copyLink(invite)}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-dim transition-colors hover:bg-elevated hover:text-fg"
                >
                  {copiedId === invite.id ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-ok" aria-hidden /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" aria-hidden /> Copy link
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => revoke(invite.id)}
                  aria-label="Revoke invite"
                  className="inline-flex items-center rounded-md px-1.5 py-1 text-faint transition-colors hover:bg-elevated hover:text-signal-soft"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Team() {
  const session = useSession();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const uid = session.status === "authed" ? session.session.user.id : null;
      const orgs = await getMyOrganizations();
      const teams: OrgTeam[] = [];
      for (const org of orgs) {
        const roster = await supabase.rpc("bc_org_team", { p_org_id: org.id });
        if (roster.error) {
          if (!cancelled) setState({ status: "error", message: roster.error.message });
          return;
        }
        const members = (roster.data ?? []) as TeamMember[];
        const myRole = members.find((m) => m.user_id === uid)?.role ?? null;

        let invites: Invite[] = [];
        if (myRole === "owner" || myRole === "gm") {
          const list = await supabase.rpc("bc_list_invites", { p_org_id: org.id });
          if (!list.error) invites = (list.data ?? []) as Invite[];
        }
        teams.push({ org, members, myRole, invites });
      }
      if (!cancelled) setState({ status: "ready", teams });
    })();
    return () => {
      cancelled = true;
    };
    // session identity is stable once authed; AuthGuard guarantees authed here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.status]);

  if (state.status === "loading") {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-faint" aria-hidden />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber/30 bg-amber/10 px-4 py-3 text-sm text-amber">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div>
          <p className="font-medium">Could not load your team.</p>
          <p className="text-amber/80">{state.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-elevated text-dim">
          <Users className="h-4 w-4" aria-hidden />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
      </div>

      {state.teams.length === 0 && (
        <p className="text-sm text-dim">
          You&rsquo;re not a member of any organization yet.
        </p>
      )}

      {state.teams.map(({ org, members, myRole, invites }) => {
        const canInvite = myRole === "owner" || myRole === "gm";
        return (
          <section key={org.id} className="space-y-4">
            <div className="flex items-baseline gap-3">
              <h2 className="text-lg font-semibold">{org.name}</h2>
              <span className="text-sm text-faint">
                {members.length} member{members.length === 1 ? "" : "s"}
              </span>
            </div>

            {members.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-line">
                {members.map((member, index) => (
                  <div
                    key={member.user_id}
                    className={cx(
                      "flex flex-wrap items-center justify-between gap-3 px-4 py-3",
                      index > 0 && "border-t border-line",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium text-fg">
                        {member.display_name ?? member.email ?? member.user_id.slice(0, 8)}
                      </div>
                      {member.email !== null && (
                        <div className="truncate text-sm text-dim">{member.email}</div>
                      )}
                    </div>
                    <span
                      className={cx(
                        "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                        roleClass(member.role),
                      )}
                    >
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {canInvite && <InvitePanel orgId={org.id} initialInvites={invites} />}
          </section>
        );
      })}
    </div>
  );
}

export default function Page() {
  return (
    <AuthGuard>
      <AppShell>
        <Team />
      </AppShell>
    </AuthGuard>
  );
}
