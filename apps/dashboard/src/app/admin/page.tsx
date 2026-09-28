"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BookOpen,
  Building2,
  Cpu,
  Inbox,
  KeyRound,
  Package,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { amIPlatformAdmin } from "@/lib/admin";
import { useLoad } from "@/hooks/use-load";
import { cx } from "@/lib/format";
import { ErrorBox, Spinner } from "@/components/admin/ui";
import { KeysSection } from "@/components/admin/keys";
import { OrgsSection } from "@/components/admin/orgs";
import { UsersSection } from "@/components/admin/users";
import { WaitlistSection } from "@/components/admin/waitlist";
import { ReleasesSection } from "@/components/admin/releases";
import { ContentSection } from "@/components/admin/content";
import { DeviceKeysSection } from "@/components/admin/device-keys";
import { AuditSection } from "@/components/admin/audit";

/**
 * The Broadcast Copy back office: /admin, /admin?s=<section>. A query
 * parameter rather than nested routes because this is a static export.
 *
 * THE GATE BELOW IS UX ONLY. It asks is_platform_admin() so a non-admin sees a
 * clear "not for you" instead of a page of errors -- but every read and write
 * the sections make is refused by the database for anyone who is not a
 * platform admin (SECURITY DEFINER RPCs that check first, RLS policies, and no
 * table privileges where none are needed; migrations 115-118).
 */

type SectionId = "keys" | "orgs" | "users" | "waitlist" | "releases" | "content" | "device-keys" | "audit";

const SECTIONS: { id: SectionId; label: string; icon: LucideIcon }[] = [
  { id: "keys", label: "Software keys", icon: KeyRound },
  { id: "orgs", label: "Organizations", icon: Building2 },
  { id: "users", label: "Users & roles", icon: UserCog },
  { id: "waitlist", label: "Waitlist", icon: Inbox },
  { id: "releases", label: "Releases", icon: Package },
  { id: "content", label: "Docs & changelog", icon: BookOpen },
  { id: "device-keys", label: "Device keys", icon: Cpu },
  { id: "audit", label: "Audit log", icon: ScrollText },
];

function isSectionId(value: string | null): value is SectionId {
  return SECTIONS.some((s) => s.id === value);
}

function Section({ id }: { id: SectionId }) {
  switch (id) {
    case "keys":
      return <KeysSection />;
    case "orgs":
      return <OrgsSection />;
    case "users":
      return <UsersSection />;
    case "waitlist":
      return <WaitlistSection />;
    case "releases":
      return <ReleasesSection />;
    case "content":
      return <ContentSection />;
    case "device-keys":
      return <DeviceKeysSection />;
    case "audit":
      return <AuditSection />;
  }
}

function BackOffice() {
  const raw = useSearchParams().get("s");
  const current: SectionId = isSectionId(raw) ? raw : "keys";

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-signal/15 text-signal-ink">
            <ShieldCheck className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Back office</h1>
            <p className="text-sm text-dim">Platform administration for Broadcast Copy. Every change is audited.</p>
          </div>
        </div>
        <nav aria-label="Back office sections">
          <ul className="flex flex-wrap gap-1.5">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <Link
                  href={s.id === "keys" ? "/admin" : `/admin?s=${s.id}`}
                  aria-current={current === s.id ? "page" : undefined}
                  className={cx(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-signal/40",
                    current === s.id
                      ? "border-signal/50 bg-signal/10 font-medium text-fg"
                      : "border-line text-dim hover:bg-elevated hover:text-fg",
                  )}
                >
                  <s.icon className="h-4 w-4" aria-hidden />
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <Section key={current} id={current} />
    </div>
  );
}

function AdminGate({ children }: { children: React.ReactNode }) {
  const { state, reload } = useLoad(amIPlatformAdmin);

  if (state.status === "loading") return <Spinner label="Checking access" />;
  if (state.status === "error") {
    return <ErrorBox title="Could not check your access." message={state.message} onRetry={reload} />;
  }
  if (state.value !== true) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-line bg-surface p-8 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-signal-ink" aria-hidden />
        <h1 className="mt-4 text-xl font-semibold">Not available</h1>
        <p className="mt-2 text-sm text-dim">
          The back office is for Broadcast Copy platform administrators. Your account is signed in but is not one.
        </p>
        <Link href="/" className="mt-6 inline-block text-sm text-signal-ink underline underline-offset-2">
          Back to your stations
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}

export default function Page() {
  return (
    <AuthGuard>
      <AppShell>
        <AdminGate>
          <Suspense fallback={<Spinner label="Loading" />}>
            <BackOffice />
          </Suspense>
        </AdminGate>
      </AppShell>
    </AuthGuard>
  );
}
