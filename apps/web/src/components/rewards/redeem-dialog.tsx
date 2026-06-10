"use client";

import { useState } from "react";
import { AlertCircle, Loader2, PartyPopper, Star } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { ArcadeReward } from "./arcade-data";

type Phase = "confirm" | "pending" | "success";

/**
 * Redeem confirmation dialog → `redeem_reward` RPC → success celebration.
 *
 * Mount with a `key` of the reward id so each selection gets fresh state.
 * The server records the redemption and decrements stock atomically; on
 * success the parent reflects the spend in the local (authoritative) balance
 * via `onRedeemed`.
 */
export function RedeemDialog({
  reward,
  balance,
  open,
  onOpenChange,
  onRedeemed,
}: {
  reward: ArcadeReward;
  balance: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRedeemed: (reward: ArcadeReward) => void;
}) {
  const [phase, setPhase] = useState<Phase>("confirm");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const after =
    balance !== null ? Math.max(0, balance - reward.pointsCost) : null;

  async function handleConfirm() {
    setPhase("pending");
    setErrorMsg(null);

    const supabase = createClient();
    const { error } = await supabase.rpc("redeem_reward", {
      p_reward_id: reward.id,
    });

    if (error) {
      setPhase("confirm");
      setErrorMsg(error.message);
      return;
    }

    onRedeemed(reward);
    toast.success(`Redeemed ${reward.name}! We'll be in touch.`);
    setPhase("success");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Don't allow closing mid-request.
        if (phase === "pending") return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        {phase !== "success" ? (
          <>
            <DialogHeader>
              <DialogTitle>Redeem {reward.name}?</DialogTitle>
              <DialogDescription>
                This will spend{" "}
                <span className="font-bold text-foreground">
                  {reward.pointsCost.toLocaleString()} WP
                </span>{" "}
                from your balance. The station will follow up with pickup or
                delivery details.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Cost</span>
                <span className="flex items-center gap-1 font-bold tabular-nums">
                  <Star className="h-3.5 w-3.5 text-[#f59e0b]" />
                  {reward.pointsCost.toLocaleString()} WP
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-muted-foreground">Your balance</span>
                <span className="font-semibold tabular-nums">
                  {balance !== null ? balance.toLocaleString() : "—"} WP
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                <span className="text-muted-foreground">After redeeming</span>
                <span className="font-bold tabular-nums text-[#74ddc7]">
                  {after !== null ? after.toLocaleString() : "—"} WP
                </span>
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                disabled={phase === "pending"}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-[#7401df] font-bold text-white hover:bg-[#7401df]/90"
                disabled={phase === "pending"}
                onClick={handleConfirm}
              >
                {phase === "pending" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redeeming…
                  </>
                ) : (
                  "Confirm redeem"
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            {/* Celebration burst — pure CSS (ping rings + bouncing icon) */}
            <div className="relative flex h-24 w-24 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-[#74ddc7]/30 [animation-duration:1.2s]" />
              <span className="absolute inset-3 animate-ping rounded-full bg-[#7401df]/25 [animation-duration:1.6s]" />
              <span className="absolute -left-1 top-2 h-2 w-2 animate-ping rounded-full bg-[#f59e0b] [animation-duration:1.1s]" />
              <span className="absolute -right-1 top-6 h-1.5 w-1.5 animate-ping rounded-full bg-[#74ddc7] [animation-duration:1.4s]" />
              <span className="absolute bottom-1 left-4 h-1.5 w-1.5 animate-ping rounded-full bg-[#7401df] [animation-duration:1.3s]" />
              <span className="relative flex h-16 w-16 animate-bounce items-center justify-center rounded-full bg-gradient-to-br from-[#7401df] to-[#74ddc7] shadow-lg shadow-[#7401df]/30">
                <PartyPopper className="h-8 w-8 text-white" />
              </span>
            </div>

            <DialogHeader>
              <DialogTitle className="text-center text-xl">
                It&apos;s yours! 🎉
              </DialogTitle>
              <DialogDescription className="text-center">
                <span className="font-semibold text-foreground">
                  {reward.name}
                </span>{" "}
                redeemed — the WCCG crew will be in touch with the details.
              </DialogDescription>
            </DialogHeader>

            {after !== null && (
              <p className="text-sm text-muted-foreground">
                New balance:{" "}
                <span className="font-bold tabular-nums text-[#74ddc7]">
                  {after.toLocaleString()} WP
                </span>
              </p>
            )}

            <Button
              className="w-full bg-[#7401df] font-bold text-white hover:bg-[#7401df]/90"
              onClick={() => onOpenChange(false)}
            >
              Back to the arcade
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
