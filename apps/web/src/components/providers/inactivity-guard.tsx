"use client";

import type { ReactNode } from "react";
import { useInactivityLogout } from "@/hooks/use-inactivity-logout";

/**
 * Thin wrapper component that activates the inactivity logout hook.
 *
 * Must be rendered inside both `<SupabaseProvider>` (for useAuth)
 * and `<AudioProvider>` (for useAudioPlayer) so the hook has access
 * to auth state and audio playback state.
 *
 * Placed as a child of `<StreamPlayerProvider>` in the root layout.
 */
export function InactivityGuard({ children }: { children: ReactNode }) {
  useInactivityLogout();
  return <>{children}</>;
}
