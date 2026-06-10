"use client";

/**
 * Compact Follow pill for a DJ in the public Mixshow Archive.
 *
 * Reuses the codebase's `entity_follows` pattern exactly (see
 * components/social/follow-button.tsx): own-row insert/delete, RLS-backed,
 * Supabase-direct. The table's CHECK constraint only allows target_type
 * 'host' | 'show' | 'user', and every DJ with published drops has a linked
 * auth user, so following a DJ = following their user (target_type 'user',
 * target_id = djs.user_id). DJs with no linked user render nothing.
 *
 * Unlike the social FollowButton (which hides when signed out), signed-out
 * visitors see the pill and get a sign-in prompt toast with a /login action.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function DjFollowButton({
  djUserId,
  djName,
  className = "",
}: {
  /** djs.user_id — the DJ's auth/profile id. Null → no follow target, renders nothing. */
  djUserId: string | null;
  djName: string;
  className?: string;
}) {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [followId, setFollowId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);

  // Check follow status once we know the signed-in user. setState only happens
  // after the await, behind the `active` guard (react-hooks/set-state-in-effect).
  useEffect(() => {
    if (!djUserId || !user) return;
    let active = true;
    void (async () => {
      const { data, error } = await supabase
        .from("entity_follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("target_type", "user")
        .eq("target_id", djUserId)
        .maybeSingle();
      if (!active) return;
      if (!error) setFollowId((data as { id: string } | null)?.id ?? null);
      setChecked(true);
    })();
    return () => {
      active = false;
    };
  }, [user, supabase, djUserId]);

  if (!djUserId) return null;

  const base =
    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors disabled:opacity-50";

  if (authLoading || (user && !checked)) {
    return (
      <span className={`${base} border-border text-muted-foreground ${className}`}>
        <Loader2 className="h-3 w-3 animate-spin" />
      </span>
    );
  }

  // Signed out → prompt to sign in instead of hiding the control.
  if (!user) {
    return (
      <button
        type="button"
        onClick={() =>
          toast("Sign in to follow " + djName, {
            description: "Followers get this DJ's new mixes in their feed.",
            action: { label: "Sign in", onClick: () => router.push("/login") },
          })
        }
        className={`${base} border-border text-muted-foreground hover:border-[#74ddc7]/50 hover:text-[#74ddc7] ${className}`}
      >
        <UserPlus className="h-3 w-3" /> Follow
      </button>
    );
  }

  const isFollowing = !!followId;

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    if (isFollowing && followId) {
      const prev = followId;
      setFollowId(null); // optimistic
      const { error } = await supabase.from("entity_follows").delete().eq("id", prev);
      if (error) {
        setFollowId(prev);
        toast.error("Failed to unfollow");
      }
    } else {
      const { data, error } = await supabase
        .from("entity_follows")
        .insert({ follower_id: user.id, target_type: "user", target_id: djUserId })
        .select("id")
        .single();
      if (error) {
        toast.error("Failed to follow");
      } else {
        setFollowId((data as { id: string }).id);
        toast.success(`Following ${djName}`);
      }
    }
    setBusy(false);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`${base} ${
        isFollowing
          ? "border-[#74ddc7]/40 bg-[#74ddc7]/10 text-[#74ddc7] hover:bg-[#74ddc7]/20"
          : "border-border text-muted-foreground hover:border-[#74ddc7]/50 hover:text-[#74ddc7]"
      } ${className}`}
    >
      {busy ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : isFollowing ? (
        <>
          <Check className="h-3 w-3" /> Following
        </>
      ) : (
        <>
          <UserPlus className="h-3 w-3" /> Follow
        </>
      )}
    </button>
  );
}
