"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Lock, Loader2, Clock } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useUserRoles, type UserRole } from "@/hooks/use-user-roles";
import { createClient } from "@/lib/supabase/client";

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

  // When access is denied, check whether the user has an APPROVAL-PENDING
  // request (creator/vendor/employee) so the screen reads "under review"
  // instead of a flat denial. Only runs on the denied path.
  const [pendingRole, setPendingRole] = useState<string | null>(null);
  useEffect(() => {
    if (loading || !user || allowed) return;
    let active = true;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("access_request_status, requested_role")
        .eq("id", user.id)
        .maybeSingle();
      if (active && data?.access_request_status === "pending") {
        setPendingRole((data.requested_role as string) ?? "access");
      }
    })();
    return () => {
      active = false;
    };
  }, [loading, user, allowed]);

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
    const roleLabel =
      pendingRole === "vendor"
        ? "Vendor"
        : pendingRole === "employee"
          ? "Staff"
          : pendingRole === "creator"
            ? "Creator"
            : null;
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          <div
            className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
              pendingRole ? "bg-[#7401df]/10" : "bg-muted"
            }`}
          >
            {pendingRole ? (
              <Clock className="h-6 w-6 text-[#7401df]" />
            ) : (
              <Lock className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <h1 className="mb-2 text-lg font-semibold">
            {pendingRole
              ? `${roleLabel ?? "Access"} request under review`
              : "Access restricted"}
          </h1>
          <p className="mb-6 text-sm text-muted-foreground">
            {pendingRole ? (
              `Your ${roleLabel ?? "access"} request is pending approval. We'll let you know as soon as an admin reviews it — then ${area} unlocks automatically.`
            ) : (
              <>
                Your account doesn&apos;t have permission to view {area}. If you
                believe this is a mistake, ask an administrator to grant your
                role.
              </>
            )}
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
