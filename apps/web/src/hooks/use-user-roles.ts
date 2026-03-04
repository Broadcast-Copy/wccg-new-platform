"use client";

import { useState, useEffect } from "react";
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

interface UseUserRolesReturn {
  roles: UserRole[];
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
}

/**
 * Hook to fetch and manage the current user's roles.
 * Returns role flags (isAdmin, isHost, etc.) for conditional rendering.
 */
export function useUserRoles(): UseUserRolesReturn {
  const { user, isLoading: authLoading } = useAuth();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setRoles([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchRoles() {
      try {
        setIsLoading(true);
        setError(null);

        const data = await apiClient<{ roles: UserRole[] }>("/users/me/roles");

        if (!cancelled) {
          setRoles(data.roles ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          // If API fails, default to listener
          console.warn("Failed to fetch user roles, defaulting to listener:", err);
          setRoles(["listener"]);
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

  // Derive department from the first matching department role
  const department =
    DEPARTMENT_ROLES.find((d) => roles.includes(d.role))?.department ?? null;

  return {
    roles,
    isSuperAdmin: roles.includes("super_admin"),
    isAdmin: roles.includes("admin") || roles.includes("super_admin"),
    isHost: roles.includes("host"),
    isListener: roles.includes("listener") || roles.length === 0,
    isSales: roles.includes("sales"),
    isCreator: roles.includes("content_creator"),
    isProduction: roles.includes("production"),
    isEngineering: roles.includes("engineering"),
    isManagement: roles.includes("management") || roles.includes("super_admin"),
    isPromotions: roles.includes("promotions"),
    isEditor: roles.includes("editor"),
    isEmployee: roles.some((r) => EMPLOYEE_ROLES.includes(r)),
    department,
    isLoading: authLoading || isLoading,
    error,
  };
}
