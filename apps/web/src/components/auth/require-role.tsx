"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Lock, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useUserRoles, type UserRole } from "@/hooks/use-user-roles";

/**
 * Client-side route guard for the static-export app.
 *
 * Authorization is evaluated against the user's REAL roles (`hasRealRole`),
 * so the cosmetic "view as" preview can never be used to reach a gated area.
 * This is defense-in-depth only — every gated resource must ALSO be protected
 * by Supabase RLS, which is the real server-side enforcement.
 */
export function RequireRole({
  roles,
  children,
  area = "this area",
}: {
  roles: UserRole[];
  children: React.ReactNode;
  /** Human label shown on the access-denied screen, e.g. "the admin console". */
  area?: string;
}) {
  const { user, isLoading: authLoading } = useAuth();
  const { hasRealRole, isLoading: rolesLoading } = useUserRoles();
  const router = useRouter();
  const pathname = usePathname();

  const loading = authLoading || rolesLoading;
  const allowed = !!user && hasRealRole(...roles);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const next = encodeURIComponent(pathname || "/my");
      router.replace(`/login?next=${next}`);
    }
  }, [loading, user, router, pathname]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <h1 className="mb-2 text-lg font-semibold">Access restricted</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Your account doesn&apos;t have permission to view {area}. If you
            believe this is a mistake, ask an administrator to grant your role.
          </p>
          <Link
            href="/my"
            className="inline-flex items-center justify-center rounded-lg bg-[#74ddc7] px-4 py-2 text-sm font-medium text-black transition hover:opacity-90"
          >
            Back to my dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
