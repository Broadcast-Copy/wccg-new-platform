"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { KEYWORDS } from "@/data/keywords";
import { hasEntered, recordEntry } from "@/lib/keyword-entries";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Keyboard, CheckCircle2, XCircle, Star, Gift } from "lucide-react";

export function KeywordEntry() {
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [lastResult, setLastResult] = useState<{
    keyword: string;
    points: number;
    prize?: string;
  } | null>(null);

  function handleSubmit() {
    const trimmed = input.trim().toUpperCase();
    if (!trimmed) {
      toast.error("Please enter a keyword.");
      return;
    }

    // Find matching active keyword
    const match = KEYWORDS.find(
      (kw) => kw.isActive && kw.keyword.toUpperCase() === trimmed,
    );

    if (!match) {
      setStatus("error");
      setLastResult(null);
      toast.error("Incorrect keyword, keep listening!");
      setTimeout(() => setStatus("idle"), 3000);
      return;
    }

    // Check if already entered (bounty tracking)
    if (hasEntered(match.id, user?.email)) {
      setStatus("error");
      setLastResult(null);
      toast.error("You have already entered this keyword!");
      setTimeout(() => setStatus("idle"), 3000);
      return;
    }

    // Record entry
    recordEntry(match.id, user?.email);
    setStatus("success");
    setLastResult({
      keyword: match.keyword,
      points: match.pointsValue,
      prize: match.prizeName,
    });
    setInput("");
    toast.success(`You earned ${match.pointsValue} pts!`);
  }

  const activeKeywords = KEYWORDS.filter((kw) => kw.isActive);

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Keyboard className="h-5 w-5 text-[#7401df]" />
          <h3 className="text-lg font-bold text-foreground">Enter Keyword</h3>
        </div>
        <Badge variant="outline" className="text-[10px] border-[#22c55e]/20 text-[#22c55e]">
          {activeKeywords.length} Active
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        Listen to WCCG 104.5 FM for the keyword, then enter it below to earn bonus points!
      </p>

      <div className="flex gap-3">
        <Input
          placeholder="Enter keyword..."
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (status !== "idle") setStatus("idle");
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          className="bg-white/5 border-border uppercase font-mono text-sm tracking-wider"
        />
        <Button
          onClick={handleSubmit}
          disabled={!input.trim()}
          className="rounded-full bg-[#7401df] text-white font-bold hover:bg-[#7401df]/90 px-6 shrink-0"
        >
          Enter
        </Button>
      </div>

      {/* Result feedback */}
      {status === "success" && lastResult && (
        <div className="flex items-start gap-3 rounded-lg border border-[#22c55e]/20 bg-[#22c55e]/5 p-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-[#22c55e] mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[#22c55e]">
              You earned {lastResult.points} pts!
            </p>
            <p className="text-xs text-muted-foreground">
              Keyword &ldquo;{lastResult.keyword}&rdquo; accepted.
              {lastResult.prize && (
                <>
                  {" "}
                  <span className="text-[#f59e0b]">
                    <Gift className="inline h-3 w-3" /> Entry for: {lastResult.prize}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="flex items-center gap-2 rounded-lg border border-[#ef4444]/20 bg-[#ef4444]/5 p-4">
          <XCircle className="h-5 w-5 text-[#ef4444]" />
          <p className="text-sm text-[#ef4444]">
            Incorrect keyword or already entered. Keep listening!
          </p>
        </div>
      )}

      {/* Active keyword hints */}
      {activeKeywords.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
            Active Keyword Contests
          </p>
          {activeKeywords.map((kw) => {
            const entered = hasEntered(kw.id, user?.email);
            return (
              <div
                key={kw.id}
                className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                  entered
                    ? "border-[#22c55e]/20 bg-[#22c55e]/5"
                    : "border-border bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center gap-3">
                  {entered ? (
                    <CheckCircle2 className="h-4 w-4 text-[#22c55e]" />
                  ) : (
                    <Star className="h-4 w-4 text-[#f59e0b]" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {kw.hint || "Listen for the keyword!"}
                    </p>
                    {kw.prizeName && (
                      <p className="text-xs text-muted-foreground/70">{kw.prizeName}</p>
                    )}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={
                    entered
                      ? "text-[10px] border-[#22c55e]/20 text-[#22c55e]"
                      : "text-[10px] border-[#f59e0b]/20 text-[#f59e0b]"
                  }
                >
                  {entered ? "Entered" : `${kw.pointsValue} pts`}
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
