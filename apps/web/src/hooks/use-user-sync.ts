"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { initSync, forcePull, flushSync } from "@/lib/user-sync";

/**
 * React hook that manages cross-device data sync lifecycle.
 *
 * - On login: initializes sync (pull + merge)
 * - On tab focus: pulls remote changes (debounced)
 * - On beforeunload: flushes pending local changes
 *
 * This is a side-effect-only hook — no return value.
 */
export function useUserSync() {
  const { user } = useAuth();
  const initializedRef = useRef(false);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id || !user?.email) {
      initializedRef.current = false;
      userIdRef.current = null;
      return;
    }

    // Only initialize once per user
    if (userIdRef.current === user.id) return;
    userIdRef.current = user.id;

    initSync(user.id, user.email).catch((err) => {
      console.warn("[use-user-sync] init failed:", err);
    });
    initializedRef.current = true;
  }, [user?.id, user?.email]);

  // Pull on tab focus (visibility change)
  useEffect(() => {
    if (!initializedRef.current) return;

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        forcePull().catch(() => {});
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [user?.id]);

  // Flush on beforeunload
  useEffect(() => {
    if (!initializedRef.current) return;

    function handleUnload() {
      // Use sync version — flushSync sets _dirty = false and fires network request
      // The browser may or may not complete it, but we try
      flushSync();
    }

    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [user?.id]);
}
