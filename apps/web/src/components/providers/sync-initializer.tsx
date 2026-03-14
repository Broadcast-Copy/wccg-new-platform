"use client";

import { useUserSync } from "@/hooks/use-user-sync";

/**
 * Invisible component that initializes cross-device data sync.
 * Place once inside the auth-aware provider tree.
 */
export function SyncInitializer() {
  useUserSync();
  return null;
}
