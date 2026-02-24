"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, Loader2, UserMinus, UserPlus } from "lucide-react";

// ------------------------------------------------------------------ Types

type TargetType = "host" | "show" | "user";

interface FollowCheckResponse {
  isFollowing: boolean;
  followId?: string;
}

interface FollowResponse {
  id: string;
}

interface FollowButtonProps {
  targetType: TargetType;
  targetId: string;
  size?: "sm" | "default";
  /** Called after a successful follow/unfollow toggle */
  onToggle?: (isFollowing: boolean) => void;
}

// ------------------------------------------------------------------ Component

export function FollowButton({
  targetType,
  targetId,
  size = "default",
  onToggle,
}: FollowButtonProps) {
  const { user, isLoading: authLoading } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followId, setFollowId] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // ---- Check follow status on mount
  const checkFollowStatus = useCallback(async () => {
    if (!user) return;
    setIsChecking(true);
    try {
      const data = await apiClient<FollowCheckResponse>(
        `/follows/check?targetType=${encodeURIComponent(targetType)}&targetId=${encodeURIComponent(targetId)}`,
      );
      setIsFollowing(data.isFollowing);
      setFollowId(data.followId ?? null);
    } catch {
      // Silently fail — the button will just show "Follow"
    } finally {
      setIsChecking(false);
    }
  }, [user, targetType, targetId]);

  useEffect(() => {
    checkFollowStatus();
  }, [checkFollowStatus]);

  // ---- Toggle follow/unfollow
  const handleToggle = async () => {
    if (!user || isToggling) return;

    setIsToggling(true);

    // Optimistic update
    const prevIsFollowing = isFollowing;
    const prevFollowId = followId;

    if (isFollowing && followId) {
      // Unfollow
      setIsFollowing(false);
      setFollowId(null);

      try {
        await apiClient(`/follows/${followId}`, { method: "DELETE" });
        onToggle?.(false);
      } catch {
        // Revert
        setIsFollowing(prevIsFollowing);
        setFollowId(prevFollowId);
        toast.error("Failed to unfollow");
      }
    } else {
      // Follow
      setIsFollowing(true);

      try {
        const data = await apiClient<FollowResponse>("/follows", {
          method: "POST",
          body: JSON.stringify({ targetType, targetId }),
        });
        setFollowId(data.id);
        onToggle?.(true);
      } catch {
        // Revert
        setIsFollowing(prevIsFollowing);
        setFollowId(prevFollowId);
        toast.error("Failed to follow");
      }
    }

    setIsToggling(false);
  };

  // Don't render if not logged in
  if (authLoading || !user) {
    return null;
  }

  // Show skeleton while checking initial status
  if (isChecking) {
    return (
      <Button
        variant="outline"
        size={size}
        disabled
        className="min-w-[90px] border-white/[0.06]"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      </Button>
    );
  }

  // ---- Following state (with hover-to-unfollow)
  if (isFollowing) {
    const showUnfollow = isHovered && !isToggling;

    return (
      <Button
        variant={showUnfollow ? "destructive" : "outline"}
        size={size}
        disabled={isToggling}
        onClick={handleToggle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`min-w-[100px] transition-all ${
          showUnfollow
            ? ""
            : "border-[#74ddc7]/30 text-[#74ddc7] hover:bg-[#74ddc7]/10 hover:text-[#74ddc7]"
        }`}
      >
        {isToggling ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : showUnfollow ? (
          <>
            <UserMinus className="h-3.5 w-3.5" />
            Unfollow
          </>
        ) : (
          <>
            <Check className="h-3.5 w-3.5" />
            Following
          </>
        )}
      </Button>
    );
  }

  // ---- Not following state
  return (
    <Button
      variant="default"
      size={size}
      disabled={isToggling}
      onClick={handleToggle}
      className="min-w-[90px]"
    >
      {isToggling ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <>
          <UserPlus className="h-3.5 w-3.5" />
          Follow
        </>
      )}
    </Button>
  );
}
