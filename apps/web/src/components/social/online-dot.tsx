"use client";

/**
 * OnlineDot — a small green presence indicator for a given user.
 *
 * Renders nothing unless that user is currently online (per the site-wide
 * PresenceProvider). Place it inside a `relative` container (e.g. an avatar
 * wrapper) and position it with `className` (e.g. "absolute bottom-0 right-0").
 */

import { useOnlinePresence } from "@/components/providers/presence-provider";

export function OnlineDot({
  userId,
  className = "",
  title = "Online now",
}: {
  userId: string | null | undefined;
  className?: string;
  title?: string;
}) {
  const { isOnline } = useOnlinePresence();
  if (!isOnline(userId)) return null;
  return (
    <span
      title={title}
      aria-label={title}
      className={`block rounded-full bg-[#22c55e] ring-2 ring-card ${className}`}
    />
  );
}
