"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { recordReferral } from "@/lib/referral";

interface ReferralEntryProps {
  email: string;
  onApplied?: () => void;
}

export function ReferralEntry({ email, onApplied }: ReferralEntryProps) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  function handleApply() {
    if (!code.trim()) return;

    const result = recordReferral(email, code.trim().toUpperCase());
    if (result.success) {
      setStatus("success");
      setMessage("Code applied! You both earned 500 points!");
      onApplied?.();
    } else {
      setStatus("error");
      setMessage(result.error ?? "Invalid code");
    }
  }

  return (
    <Card className="border-white/10 bg-white/5">
      <CardHeader>
        <CardTitle className="text-lg text-white">Have a Referral Code?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-white/60">
          If someone referred you to WCCG 104.5 FM, enter their code below.
          You&apos;ll both earn 500 bonus points!
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setStatus("idle");
              setMessage("");
            }}
            placeholder="Enter referral code"
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white uppercase font-mono placeholder:text-white/30 focus:border-[#74ddc7] focus:outline-none focus:ring-1 focus:ring-[#74ddc7]"
            disabled={status === "success"}
          />
          <Button
            onClick={handleApply}
            disabled={!code.trim() || status === "success"}
            className="bg-[#74ddc7] hover:bg-[#74ddc7]/80 text-[#0a0a0f] font-semibold"
          >
            Apply Code
          </Button>
        </div>

        {message && (
          <div
            className={`rounded-lg px-4 py-3 text-sm ${
              status === "success"
                ? "bg-[#74ddc7]/10 border border-[#74ddc7]/20 text-[#74ddc7]"
                : "bg-red-500/10 border border-red-500/20 text-red-400"
            }`}
          >
            {message}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
