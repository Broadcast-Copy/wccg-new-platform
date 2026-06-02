"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAuth } from "./use-auth";
import { useSupabase } from "@/components/providers/supabase-provider";

export type UserRole =
  | "super_admin"
  | "admin"
  | "host"
  | "listener"
  | "content_creator"
  | "editor"
  | "role_admin"
  | "sales"
  | "production"
  | "engineering"
  | "management"
  | "promotions"
  | "operations"
  | "gm"
  | "traffic"
  | "vendor";

const VALID_ROLES: ReadonlySet<UserRole> = new Set<UserRole>([
  "super_admin", "admin", "host", "listener", "content_creator", "editor",
  "sales", "production", "engineering", "management", "promotions",
  "operations", "gm", "traffic", "vendor",
]);

const DEPARTMENT_ROLES: { role: UserRole; department: string }[] = [
  { role: "sales", department: "sales" },
  { role: "production", department: "production" },
  { role: "engineering", department: "engineering" },
  { role: "management", department: "management" },
  { role: "promotions", department: "promotions" },
];

const EMPLOYEE_ROLES: UserRole[] = [
  "sales",
  "production",
  "engineering",
  "management",
  "promotions",
  "host",
];

const ROLE_OVERRIDE_KEY = "wccg_role_override";
const ROLE_CHANGE_EVENT = "wccg-role-override-change";

interface UseUserRolesReturn {
  roles: UserRole[];
  realRoles: UserRole[];
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isHost: boolean;
  isListener: boolean;
  isSales: boolean;
  isCreator: boolean;
  isVendor: boolean;
  isProduction: boolean;
  isEngineering: boolean;
  isManagement: boolean;
  isPromotions: boolean;
  isEditor: boolean;
  isEmployee: boolean;
  /** TRUE only if the user's REAL (non-preview) roles include admin/super_admin. */
  isRealAdmin: boolean;
  department: string | null;
  isLoading: boolean;
  error: string | null;
  // Role override (cosmetic preview only — never widens authorization)
  roleOverride: UserRole | null;
  isOverrideActive: boolean;
  setRoleOverride: (role: UserRole | null) => void;
  /** Authorization check — always evaluates against REAL roles (ignores preview). */
  hasRealRole: (...roles: UserRole[]) => boolean;
}

function readOverride(): UserRole | null {
  if (typeof window === "undefined") return null;
  try {
    return (localStorage.getItem(ROLE_OVERRIDE_KEY) as UserRole) || null;
  } catch {
    return null;
  }
}

/** Normalise a stored role_id ("role_admin") to a UserRole ("admin"). */
function normaliseRole(raw: string): UserRole | null {
  const v = raw.startsWith("role_") ? raw.slice(5) : raw;
  return VALID_ROLES.has(v as UserRole) ? (v as UserRole) : null;
}

/**
 * Hook to fetch and manage the current user's roles — Supabase-direct.
 *
 * Roles are resolved from two sources (the app has NO API server):
 *   1. public.user_roles  — staff/department roles (role_id, e.g. role_admin)
 *   2. public.profiles    — user_type + has_creator_access / has_vendor_access
 *
 * `realRoles` is the authoritative set used for authorization (route guards
 * + RLS). `roles` applies the optional cosmetic override so an operator can
 * PREVIEW another role's dashboard/nav — it never grants access, because all
 * guards check `realRoles`/`hasRealRole` and the database enforces RLS.
 */
export function useUserRoles(): UseUserRolesReturn {
  const { user, isLoading: authLoading } = useAuth();
  const { supabase } = useSupabase();
  const [realRoles, setRealRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleOverride, setRoleOverrideState] = useState<UserRole | null>(readOverride);
  const realRolesRef = useRef<UserRole[]>([]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setRealRoles([]);
      realRolesRef.current = [];
      setIsLoading(false);
      setRoleOverrideState(null);
      try { localStorage.removeItem(ROLE_OVERRIDE_KEY); } catch { /* noop */ }
      return;
    }

    let cancelled = false;

    async function fetchRoles() {
      try {
        setIsLoading(true);
        setError(null);

        const [rolesRes, profileRes] = await Promise.all([
          supabase.from("user_roles").select("role_id").eq("profile_id", user!.id),
          supabase
            .from("profiles")
            .select("user_type, has_creator_access, has_vendor_access")
            .eq("id", user!.id)
            .maybeSingle(),
        ]);

        const set = new Set<UserRole>();

        // 1) staff/department roles from user_roles
        for (const row of rolesRes.data ?? []) {
          const r = normaliseRole(String((row as { role_id: string }).role_id));
          if (r) set.add(r);
        }

        // 2) roles implied by the profile record
        const profile = profileRes.data as
          | { user_type: string | null; has_creator_access: boolean | null; has_vendor_access: boolean | null }
          | null;
        if (profile) {
          const ut = normaliseRole(profile.user_type ?? "");
          if (ut) set.add(ut);
          if (profile.has_creator_access) set.add("content_creator");
          if (profile.has_vendor_access) set.add("vendor");
        }

        // every authenticated user is at least a listener
        set.add("listener");

        const resolved = Array.from(set);
        if (!cancelled) {
          setRealRoles(resolved);
          realRolesRef.current = resolved;
        }
      } catch (err) {
        if (!cancelled) {
          console.warn("Failed to resolve user roles, defaulting to listener:", err);
          const fallback: UserRole[] = ["listener"];
          setRealRoles(fallback);
          realRolesRef.current = fallback;
          setError(err instanceof Error ? err.message : "Failed to fetch roles");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchRoles();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, supabase]);

  const isRealAdmin = useMemo(
    () => realRoles.includes("admin") || realRoles.includes("super_admin"),
    [realRoles],
  );

  // Set role override — cosmetic preview. Allowed only for roles the user
  // genuinely holds, or for real admins (who may preview any role). "listener"
  // is always allowed (reset / base view). This NEVER widens authorization.
  const setRoleOverride = useCallback(
    (role: UserRole | null) => {
      const allowed =
        role === null ||
        role === "listener" ||
        isRealAdmin ||
        realRolesRef.current.includes(role);
      if (!allowed) return;

      setRoleOverrideState(role);
      try {
        if (role) {
          localStorage.setItem(ROLE_OVERRIDE_KEY, role);
        } else {
          localStorage.removeItem(ROLE_OVERRIDE_KEY);
        }
      } catch { /* noop */ }
      window.dispatchEvent(
        new CustomEvent(ROLE_CHANGE_EVENT, { detail: { role } }),
      );
    },
    [isRealAdmin],
  );

  // Sync override state across all hook instances in this tab
  useEffect(() => {
    const handler = (e: Event) => {
      const role = (e as CustomEvent).detail?.role as UserRole | null;
      setRoleOverrideState(role);
    };
    window.addEventListener(ROLE_CHANGE_EVENT, handler);
    return () => window.removeEventListener(ROLE_CHANGE_EVENT, handler);
  }, []);

  // Effective roles: preview override (if set & permitted) else real roles
  const isOverrideActive = roleOverride !== null;
  const effectiveRoles = useMemo(() => {
    if (isOverrideActive && roleOverride) {
      return [roleOverride] as UserRole[];
    }
    return realRoles;
  }, [isOverrideActive, roleOverride, realRoles]);

  const department =
    DEPARTMENT_ROLES.find((d) => effectiveRoles.includes(d.role))?.department ?? null;

  const hasRealRole = useCallback(
    (...roles: UserRole[]) =>
      isRealAdmin || roles.some((r) => realRoles.includes(r)),
    [isRealAdmin, realRoles],
  );

  return {
    roles: effectiveRoles,
    realRoles,
    isSuperAdmin: effectiveRoles.includes("super_admin"),
    isAdmin: effectiveRoles.includes("admin") || effectiveRoles.includes("super_admin"),
    isHost: effectiveRoles.includes("host"),
    isListener: effectiveRoles.includes("listener") || effectiveRoles.length === 0,
    isSales: effectiveRoles.includes("sales"),
    isCreator: effectiveRoles.includes("content_creator"),
    isVendor: effectiveRoles.includes("vendor"),
    isProduction: effectiveRoles.includes("production"),
    isEngineering: effectiveRoles.includes("engineering"),
    isManagement: effectiveRoles.includes("management") || effectiveRoles.includes("super_admin"),
    isPromotions: effectiveRoles.includes("promotions"),
    isEditor: effectiveRoles.includes("editor"),
    isEmployee: effectiveRoles.some((r) => EMPLOYEE_ROLES.includes(r)),
    isRealAdmin,
    department,
    isLoading: authLoading || isLoading,
    error,
    roleOverride,
    isOverrideActive,
    setRoleOverride,
    hasRealRole,
  };
}
