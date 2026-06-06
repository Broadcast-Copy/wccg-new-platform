"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * MessageButton — a small reusable control that links to the DM inbox with a
 * conversation pre-opened (`/my/messages?to=<recipientId>`).
 *
 * It hides itself when the recipient is the current user (you can't DM
 * yourself). The current user is resolved lazily via supabase.auth.getUser()
 * so the button can be dropped anywhere without prop drilling the viewer id.
 *
 * Variants:
 *   - "icon"  (default) → a compact circular icon button, ideal on avatars/rows
 *   - "button"          → a pill with an icon + "Message" label
 *   - "inline"          → a text-style link with a small icon
 */
type MessageButtonVariant = "icon" | "button" | "inline";

interface MessageButtonProps {
  recipientId: string;
  recipientName?: string;
  variant?: MessageButtonVariant;
  /** Accent color for the icon/pill. Defaults to the app teal. */
  accentColor?: string;
  className?: string;
  /**
   * Optional text to pre-fill the compose box with when the thread opens
   * (passed through as `?text=` and seeded into the draft). Handy for nudges
   * like "please upload your mix for Friday 5pm".
   */
  prefill?: string;
  /** Override the pill label (the "button" variant only). Defaults to "Message". */
  label?: string;
}

const TEAL = "#74ddc7";

export function MessageButton({
  recipientId,
  recipientName,
  variant = "icon",
  accentColor = TEAL,
  className,
  prefill,
  label,
}: MessageButtonProps) {
  // null = unknown yet, "" = signed out, otherwise the viewer's id.
  const [meId, setMeId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setMeId(data.user?.id ?? "");
    });
    return () => {
      active = false;
    };
  }, []);

  // Don't render a "message yourself" control. While the viewer is still
  // resolving (meId === null) we render optimistically; once we learn it's the
  // current user, we drop it.
  if (meId && meId === recipientId) return null;

  const href = `/my/messages?to=${encodeURIComponent(recipientId)}${
    prefill ? `&text=${encodeURIComponent(prefill)}` : ""
  }`;
  const aria = recipientName ? `Message ${recipientName}` : "Send a message";

  if (variant === "button") {
    return (
      <Link
        href={href}
        aria-label={aria}
        title={aria}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold text-white transition-opacity hover:opacity-90",
          className,
        )}
        style={{ backgroundColor: accentColor }}
      >
        <Send className="h-3 w-3" /> {label ?? "Message"}
      </Link>
    );
  }

  if (variant === "inline") {
    return (
      <Link
        href={href}
        aria-label={aria}
        title={aria}
        className={cn(
          "inline-flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-80",
          className,
        )}
        style={{ color: accentColor }}
      >
        <MessageCircle className="h-3.5 w-3.5" /> Message
      </Link>
    );
  }

  // "icon" — compact circular button, sized to sit on avatars / member rows.
  return (
    <Link
      href={href}
      aria-label={aria}
      title={aria}
      className={cn(
        "inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
      style={{ ["--mb-accent" as string]: accentColor }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = accentColor;
        e.currentTarget.style.borderColor = accentColor;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "";
        e.currentTarget.style.borderColor = "";
      }}
    >
      <MessageCircle className="h-3.5 w-3.5" />
    </Link>
  );
}

export default MessageButton;
