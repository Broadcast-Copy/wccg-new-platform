"use client";

import type { ReactNode } from "react";

/**
 * InactivityGuard — DISABLED.
 *
 * The old useInactivityLogout hook used window.confirm() which fired
 * even when not playing. Replaced by StillListeningModal component
 * in the main layout which only triggers after 1hr of active playback.
 */
export function InactivityGuard({ children }: { children: ReactNode }) {
  // useInactivityLogout() — disabled, replaced by StillListeningModal
  return <>{children}</>;
}
