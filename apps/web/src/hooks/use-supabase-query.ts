"use client";

import { useState, useEffect, useCallback } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useAuth } from "@/hooks/use-auth";

interface UseSupabaseQueryOptions {
  /** Column to filter by user (e.g., "user_id", "vendor_id") */
  userColumn?: string;
  /** Only fetch for the current user (default: true) */
  filterByUser?: boolean;
  /** Order by column */
  orderBy?: string;
  /** Order direction */
  ascending?: boolean;
  /** Additional eq filters */
  filters?: Record<string, string | number | boolean>;
  /** Auto-fetch on mount (default: true) */
  autoFetch?: boolean;
}

/**
 * Generic hook for CRUD operations on a Supabase table.
 * Handles loading, errors, and auto-fetching with user scoping.
 */
export function useSupabaseQuery<T extends { id?: string }>(
  table: string,
  options: UseSupabaseQueryOptions = {}
) {
  const {
    userColumn = "user_id",
    filterByUser = true,
    orderBy = "created_at",
    ascending = false,
    filters = {},
    autoFetch = true,
  } = options;

  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (filterByUser && !user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      let query = supabase.from(table).select("*");

      if (filterByUser && user?.id) {
        query = query.eq(userColumn, user.id);
      }

      for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value);
      }

      query = query.order(orderBy, { ascending });

      const { data: result, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setData((result as T[]) || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch data";
      setError(msg);
      console.error(`Supabase query error (${table}):`, err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, table, user?.id, userColumn, filterByUser, orderBy, ascending, JSON.stringify(filters)]);

  const insert = useCallback(
    async (record: Partial<T>): Promise<T | null> => {
      if (!user?.id) return null;

      try {
        const payload = filterByUser
          ? { ...record, [userColumn]: user.id }
          : record;

        const { data: result, error: insertError } = await supabase
          .from(table)
          .insert(payload)
          .select()
          .single();

        if (insertError) throw insertError;

        const inserted = result as T;
        setData((prev) => [inserted, ...prev]);
        return inserted;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to insert";
        setError(msg);
        return null;
      }
    },
    [supabase, table, user?.id, userColumn, filterByUser]
  );

  const update = useCallback(
    async (id: string, updates: Partial<T>): Promise<T | null> => {
      try {
        const { data: result, error: updateError } = await supabase
          .from(table)
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq("id", id)
          .select()
          .single();

        if (updateError) throw updateError;

        const updated = result as T;
        setData((prev) =>
          prev.map((item) => (item.id === id ? updated : item))
        );
        return updated;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to update";
        setError(msg);
        return null;
      }
    },
    [supabase, table]
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const { error: deleteError } = await supabase
          .from(table)
          .delete()
          .eq("id", id);

        if (deleteError) throw deleteError;

        setData((prev) => prev.filter((item) => item.id !== id));
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to delete";
        setError(msg);
        return false;
      }
    },
    [supabase, table]
  );

  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [autoFetch, fetchData]);

  return {
    data,
    setData,
    isLoading,
    error,
    refetch: fetchData,
    insert,
    update,
    remove,
  };
}
