"use client";

import { useId, useState } from "react";
import { ChevronLeft, ChevronRight, Search, ShieldCheck, ShieldMinus, ShieldPlus, UserCog } from "lucide-react";
import {
  USERS_PAGE,
  grantSuperAdmin,
  listUsers,
  revokeSuperAdmin,
  type AdminUser,
} from "@/lib/admin";
import { useLoad } from "@/hooks/use-load";
import { useSession } from "@/hooks/use-session";
import { cx } from "@/lib/format";
import {
  BTN_SECONDARY,
  Chip,
  ConfirmAction,
  EmptyState,
  ErrorBox,
  FIELD,
  LABEL,
  Notice,
  Refreshing,
  SectionHeader,
  Spinner,
  fmtDate,
  fmtDateTime,
} from "@/components/admin/ui";

/**
 * Accounts and the super-admin role. Read through bc_admin_users (auth.users
 * joined to profiles and roles: e-mail, created, confirmed, last sign-in --
 * never a password hash or token). Granting and revoking go through RPCs; the
 * database refuses to remove the LAST super admin (the RPC and a trigger on
 * user_roles, migration 117). There is no password setting and no account
 * creation here: people sign up, or are invited from Team.
 */

function UserRow({
  user,
  isMe,
  adminCount,
  onChanged,
}: {
  user: AdminUser;
  isMe: boolean;
  adminCount: number | null;
  onChanged: () => void;
}) {
  const who = user.email ?? user.user_id;
  const last = user.is_super_admin && adminCount === 1;

  return (
    <li className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-line bg-surface p-4">
      <div className="min-w-0 text-sm">
        <p className="flex flex-wrap items-center gap-2">
          <span className="font-medium break-all text-fg">{who}</span>
          {user.is_super_admin && <Chip tone="danger">super admin</Chip>}
          {isMe && <Chip tone="muted">you</Chip>}
          {!user.email_confirmed_at && <Chip tone="warn">unconfirmed</Chip>}
        </p>
        {user.display_name && <p className="mt-0.5 text-dim">{user.display_name}</p>}
        <p className="mt-1 text-dim">
          Created {fmtDate(user.created_at)} · last sign-in {user.last_sign_in_at ? fmtDateTime(user.last_sign_in_at) : "never"}
          {user.org_count > 0 ? ` · ${user.org_count} organization${user.org_count === 1 ? "" : "s"}` : ""}
          {user.user_type ? ` · ${user.user_type}` : ""}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {user.is_super_admin ? (
          <ConfirmAction
            label="Remove super admin"
            icon={ShieldMinus}
            disabled={last}
            disabledReason="This is the last super admin. Grant the role to someone else first."
            title={`Remove super admin from ${who}?`}
            body={
              <>
                {isMe && <p className="font-medium text-signal-ink">This is your own account: you lose this back office the moment it completes.</p>}
                <p>They keep their account and organizations; only platform-wide access goes.</p>
              </>
            }
            confirmLabel="Yes, remove the role"
            onConfirm={() => revokeSuperAdmin(user.user_id)}
            onDone={onChanged}
          />
        ) : (
          <ConfirmAction
            label="Make super admin"
            icon={ShieldPlus}
            title={`Make ${who} a super admin?`}
            body={
              <>
                <p>A super admin can read and change every organization, station, key, account role and the waitlist.</p>
                <p>
                  This database still also serves the flagship station, where the same role counts as station staff.
                  Grant it only to people you would trust with both.
                </p>
              </>
            }
            confirmLabel="Yes, grant super admin"
            onConfirm={() => grantSuperAdmin(user.user_id)}
            onDone={onChanged}
          />
        )}
      </div>
      {last && (
        <p className="w-full basis-full text-xs text-faint">
          The last super admin cannot be removed: the database refuses it.
        </p>
      )}
    </li>
  );
}

export function UsersSection() {
  const session = useSession();
  const myId = session.status === "authed" ? session.session.user.id : null;
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [adminsOnly, setAdminsOnly] = useState(false);
  const [page, setPage] = useState(0);
  const id = useId();

  const users = useLoad(() => listUsers(search, adminsOnly, page * USERS_PAGE), `${search}|${adminsOnly}|${page}`);
  const admins = useLoad(() => listUsers("", true, 0));

  const adminCount =
    admins.state.status === "ready" ? (admins.state.value[0]?.total_count ?? 0) : null;
  const total = users.state.status === "ready" ? (users.state.value[0]?.total_count ?? 0) : 0;
  const pages = Math.max(1, Math.ceil(total / USERS_PAGE));

  function changed() {
    users.reload();
    admins.reload();
  }

  return (
    <section className="space-y-5" aria-labelledby="users-heading">
      <SectionHeader
        id="users-heading"
        icon={UserCog}
        title="Users & roles"
        description="Every account on the platform: when it was created and last signed in, and who is a super admin."
        actions={<Refreshing on={users.state.status === "ready" && users.state.refreshing} />}
      />

      <Notice>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4" aria-hidden />
          {adminCount === null ? "Counting super admins…" : `${adminCount} super admin${adminCount === 1 ? "" : "s"}.`}
        </span>{" "}
        No passwords are set and no accounts are created here: people sign up themselves or are invited from Team.
      </Notice>

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setSearch(draft);
          setPage(0);
        }}
      >
        <div className="min-w-[12rem] flex-1 space-y-1.5 sm:max-w-sm">
          <label className={LABEL} htmlFor={`${id}-q`}>
            Search e-mail or name
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-faint" aria-hidden />
            <input
              id={`${id}-q`}
              type="search"
              className={cx(FIELD, "pl-9")}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          </div>
        </div>
        <button type="submit" className={BTN_SECONDARY}>
          Search
        </button>
        <label className="inline-flex items-center gap-2 py-2 text-sm text-dim">
          <input
            type="checkbox"
            className="h-4 w-4 accent-signal"
            checked={adminsOnly}
            onChange={(e) => {
              setAdminsOnly(e.target.checked);
              setPage(0);
            }}
          />
          Super admins only
        </label>
      </form>

      {users.state.status === "loading" && <Spinner label="Loading accounts" />}
      {users.state.status === "error" && (
        <ErrorBox title="Could not load accounts." message={users.state.message} onRetry={users.reload} />
      )}
      {users.state.status === "ready" &&
        (users.state.value.length === 0 ? (
          <EmptyState>No account matches.</EmptyState>
        ) : (
          <>
            <p className="text-sm text-dim" role="status">
              {total} account{total === 1 ? "" : "s"}
              {pages > 1 ? ` · page ${page + 1} of ${pages}` : ""}
            </p>
            <ul className="space-y-2" aria-label="Accounts">
              {users.state.value.map((u) => (
                <UserRow key={u.user_id} user={u} isMe={u.user_id === myId} adminCount={adminCount} onChanged={changed} />
              ))}
            </ul>
            {pages > 1 && (
              <nav className="flex items-center gap-2" aria-label="Pages">
                <button
                  type="button"
                  className={BTN_SECONDARY}
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                  Previous
                </button>
                <button
                  type="button"
                  className={BTN_SECONDARY}
                  disabled={page + 1 >= pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </nav>
            )}
          </>
        ))}
    </section>
  );
}
