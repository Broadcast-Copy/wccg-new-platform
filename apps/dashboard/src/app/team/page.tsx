"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Users } from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { getMyOrganizations } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import type { Organization } from "@/lib/types";
import { cx } from "@/lib/format";

/**
 * Team roster. RLS only lets a member read their OWN membership row, so the
 * full roster comes from the SECURITY DEFINER RPC bc_org_team (migration 098),
 * which returns members only for orgs the caller belongs to.
 */

type TeamMember = {
  user_id: string;
  role: string;
  display_name: string | null;
  email: string | null;
  joined_at: string;
};

type OrgTeam = { org: Organization; members: TeamMember[] };

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; teams: OrgTeam[] };

const ROLE_STYLE = new Map<string, string>([
  ["owner", "bg-signal/15 text-signal-soft"],
  ["gm", "bg-amber/15 text-amber"],
  ["om", "bg-amber/15 text-amber"],
  ["billing", "bg-elevated text-dim"],
]);

function roleClass(role: string): string {
  return ROLE_STYLE.get(role) ?? "bg-elevated text-faint";
}

function Team() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const orgs = await getMyOrganizations();
      const teams: OrgTeam[] = [];
      for (const org of orgs) {
        const { data, error } = await supabase.rpc("bc_org_team", {
          p_org_id: org.id,
        });
        if (error) {
          if (!cancelled) setState({ status: "error", message: error.message });
          return;
        }
        teams.push({ org, members: (data ?? []) as TeamMember[] });
      }
      if (!cancelled) setState({ status: "ready", teams });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

      {state.teams.map(({ org, members }) => (
        <section key={org.id} className="space-y-4">
          <div className="flex items-baseline gap-3">
            <h2 className="text-lg font-semibold">{org.name}</h2>
            <span className="text-sm text-faint">
              {members.length} member{members.length === 1 ? "" : "s"}
            </span>
          </div>

          {members.length === 0 ? (
            <p className="text-sm text-dim">No team members yet.</p>
          ) : (
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
                      {member.display_name ??
                        member.email ??
                        member.user_id.slice(0, 8)}
                    </div>
                    {member.email !== null && (
                      <div className="truncate text-sm text-dim">
                        {member.email}
                      </div>
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
        </section>
      ))}
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
