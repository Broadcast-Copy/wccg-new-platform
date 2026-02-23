"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./use-auth";
import { apiClient } from "@/lib/api-client";

export type UserRole = "super_admin" | "admin" | "host" | "listener";

interface UseUserRolesReturn {
  roles: UserRole[];
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isHost: boolean;
  isListener: boolean;
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

  return {
    roles,
    isSuperAdmin: roles.includes("super_admin"),
    isAdmin: roles.includes("admin") || roles.includes("super_admin"),
    isHost: roles.includes("host"),
    isListener: roles.includes("listener") || roles.length === 0,
    isLoading: authLoading || isLoading,
    error,
  };
}
