"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAuth } from "./use-auth";
import { apiClient } from "@/lib/api-client";

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
  | "promotions";

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
  isProduction: boolean;
  isEngineering: boolean;
  isManagement: boolean;
  isPromotions: boolean;
  isEditor: boolean;
  isEmployee: boolean;
  department: string | null;
  isLoading: boolean;
  error: string | null;
  // Role override (admin only)
  roleOverride: UserRole | null;
  isOverrideActive: boolean;
  setRoleOverride: (role: UserRole | null) => void;
}

function readOverride(): UserRole | null {
  if (typeof window === "undefined") return null;
  try {
    return (localStorage.getItem(ROLE_OVERRIDE_KEY) as UserRole) || null;
  } catch {
    return null;
  }
}

/**
 * Hook to fetch and manage the current user's roles.
 * Returns role flags (isAdmin, isHost, etc.) for conditional rendering.
 * Admins can set a roleOverride to preview other role perspectives.
 */
export function useUserRoles(): UseUserRolesReturn {
  const { user, isLoading: authLoading } = useAuth();
  const [apiRoles, setApiRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleOverride, setRoleOverrideState] = useState<UserRole | null>(readOverride);
  const realRolesRef = useRef<UserRole[]>([]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setApiRoles([]);
      setIsLoading(false);
      // Clear override on sign-out
      setRoleOverrideState(null);
      try { localStorage.removeItem(ROLE_OVERRIDE_KEY); } catch { /* noop */ }
      return;
    }

    let cancelled = false;

    async function fetchRoles() {
      try {
        setIsLoading(true);
        setError(null);

        const data = await apiClient<{ roles: UserRole[] }>("/users/me/roles");

        if (!cancelled) {
          const fetched = data.roles ?? [];
          setApiRoles(fetched);
          realRolesRef.current = fetched;
        }
      } catch (err) {
        if (!cancelled) {
          // If API fails, default to listener
          console.warn("Failed to fetch user roles, defaulting to listener:", err);
          const fallback: UserRole[] = ["listener"];
          setApiRoles(fallback);
          realRolesRef.current = fallback;
          setError(err instanceof Error ? err.message : "Failed to fetch roles");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchRoles();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  // Determine if the user's REAL roles include admin
  const isRealAdmin = useMemo(
    () => apiRoles.includes("admin") || apiRoles.includes("super_admin"),
    [apiRoles],
  );

  // Set role override — available to all users for dashboard preview
  const setRoleOverride = useCallback(
    (role: UserRole | null) => {
      setRoleOverrideState(role);
      try {
        if (role) {
          localStorage.setItem(ROLE_OVERRIDE_KEY, role);
        } else {
          localStorage.removeItem(ROLE_OVERRIDE_KEY);
        }
      } catch { /* noop */ }
      // Notify ALL hook instances in this tab so every component re-renders
      window.dispatchEvent(
        new CustomEvent(ROLE_CHANGE_EVENT, { detail: { role } }),
      );
    },
    [],
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

  // Effective roles: use override if set, otherwise use API roles
  const isOverrideActive = roleOverride !== null;
  const effectiveRoles = useMemo(() => {
    if (isOverrideActive && roleOverride) {
      return [roleOverride] as UserRole[];
    }
    return apiRoles;
  }, [isOverrideActive, roleOverride, apiRoles]);

  // Derive department from the first matching department role
  const department =
    DEPARTMENT_ROLES.find((d) => effectiveRoles.includes(d.role))?.department ?? null;

  return {
    roles: effectiveRoles,
    realRoles: apiRoles,
    isSuperAdmin: effectiveRoles.includes("super_admin"),
    isAdmin: effectiveRoles.includes("admin") || effectiveRoles.includes("super_admin"),
    isHost: effectiveRoles.includes("host"),
    isListener: effectiveRoles.includes("listener") || effectiveRoles.length === 0,
    isSales: effectiveRoles.includes("sales"),
    isCreator: effectiveRoles.includes("content_creator"),
    isProduction: effectiveRoles.includes("production"),
    isEngineering: effectiveRoles.includes("engineering"),
    isManagement: effectiveRoles.includes("management") || effectiveRoles.includes("super_admin"),
    isPromotions: effectiveRoles.includes("promotions"),
    isEditor: effectiveRoles.includes("editor"),
    isEmployee: effectiveRoles.some((r) => EMPLOYEE_ROLES.includes(r)),
    department,
    isLoading: authLoading || isLoading,
    error,
    // Override API
    roleOverride,
    isOverrideActive,
    setRoleOverride,
  };
}
