"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { loadReferral, generateCode, getReferralUrl, getStats } from "@/lib/referral";

interface ReferralCardProps {
  email: string;
}

export function ReferralCard({ email }: ReferralCardProps) {
  const [code, setCode] = useState("");
  const [stats, setStats] = useState({ referralCount: 0, totalPointsEarned: 0, referredBy: null as string | null });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!email) return;
    const userCode = generateCode(email);
    setCode(userCode);
    const s = getStats(email);
    setStats({ referralCount: s.referralCount, totalPointsEarned: s.totalPointsEarned, referredBy: s.referredBy });
  }, [email]);

  async function handleCopy() {
    const url = getReferralUrl(code);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleShare() {
    const url = getReferralUrl(code);
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join WCCG 104.5 FM",
          text: `Use my referral code ${code} to join WCCG 104.5 FM and we both get 500 points!`,
          url,
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      handleCopy();
    }
  }

  return (
    <Card className="border-white/10 bg-gradient-to-br from-[#7401df]/20 via-white/5 to-[#7401df]/10">
      <CardHeader>
        <CardTitle className="text-lg text-white flex items-center gap-2">
          Your Referral Code
          <Badge variant="secondary" className="bg-[#7401df]/30 text-[#74ddc7] text-xs">
            500 pts each
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Large copyable code */}
        <div
          onClick={handleCopy}
          className="cursor-pointer rounded-xl border-2 border-dashed border-[#7401df]/40 bg-[#7401df]/10 px-6 py-4 text-center transition-colors hover:border-[#7401df]/60 hover:bg-[#7401df]/15"
        >
          <p className="text-2xl font-bold tracking-wider text-white font-mono">
            {code}
          </p>
          <p className="mt-1 text-xs text-white/50">
            {copied ? "Copied!" : "Click to copy code"}
          </p>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={handleCopy}
            variant="outline"
            className="border-white/10 bg-white/5 text-white hover:bg-white/10"
          >
            {copied ? "Copied!" : "Copy Link"}
          </Button>
          <Button
            onClick={handleShare}
            className="bg-[#7401df] hover:bg-[#7401df]/80 text-white"
          >
            Share
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-center">
            <p className="text-2xl font-bold text-[#74ddc7]">{stats.referralCount}</p>
            <p className="text-xs text-white/50">Friends Referred</p>
          </div>
          <div className="rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-center">
            <p className="text-2xl font-bold text-[#74ddc7]">{stats.totalPointsEarned}</p>
            <p className="text-xs text-white/50">Points Earned</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
