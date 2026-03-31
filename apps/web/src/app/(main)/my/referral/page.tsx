"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useSupabase } from "@/components/providers/supabase-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  CheckCircle2,
  Share2,
  QrCode,
  Gift,
  Users,
  Star,
  Clock,
  UserPlus,
} from "lucide-react";
import {
  generateCode,
  getReferralUrl,
  getStats,
  loadReferral,
  recordReferral,
} from "@/lib/referral";

// ---------------------------------------------------------------------------
// Teal accent: #14b8a6
// ---------------------------------------------------------------------------

const TEAL = "#14b8a6";

// Mock referral signups for the "Your Referrals" list
const MOCK_REFERRAL_SIGNUPS = [
  { name: "Jordan M.", date: "2026-03-28", points: 100 },
  { name: "Taylor R.", date: "2026-03-25", points: 100 },
  { name: "Casey W.", date: "2026-03-20", points: 100 },
  { name: "Alex P.", date: "2026-03-15", points: 100 },
];

export default function ReferralPage() {
  const { user, isLoading } = useAuth();

  const [code, setCode] = useState("");
  const [referralUrl, setReferralUrl] = useState("");
  const [stats, setStats] = useState({ referralCount: 0, totalPointsEarned: 0, referredBy: null as string | null });
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  // Referral entry state
  const [entryCode, setEntryCode] = useState("");
  const [entryStatus, setEntryStatus] = useState<"idle" | "success" | "error">("idle");
  const [entryMessage, setEntryMessage] = useState("");

  useEffect(() => {
    if (!user?.email) return;
    const userCode = generateCode(user.email);
    setCode(userCode);
    const url = getReferralUrl(userCode);
    setReferralUrl(url);
    const s = getStats(user.email);
    setStats(s);
  }, [user?.email]);

  // Use real stats plus mock data for display
  const displayReferralCount = useMemo(
    () => Math.max(stats.referralCount, MOCK_REFERRAL_SIGNUPS.length),
    [stats.referralCount],
  );
  const displayPointsEarned = useMemo(
    () => Math.max(stats.totalPointsEarned, MOCK_REFERRAL_SIGNUPS.length * 100),
    [stats.totalPointsEarned],
  );

  const qrUrl = useMemo(() => {
    if (!referralUrl) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(referralUrl)}&bgcolor=0a0a0f&color=14b8a6`;
  }, [referralUrl]);

  const handleCopy = useCallback(async () => {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = referralUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [referralUrl]);

  const handleShare = useCallback(async () => {
    if (!referralUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join WCCG 104.5 FM",
          text: `Use my referral code ${code} to join WCCG 104.5 FM and earn 100 bonus points!`,
          url: referralUrl,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopy();
    }
  }, [referralUrl, code, handleCopy]);

  const handleApplyCode = useCallback(() => {
    if (!entryCode.trim() || !user?.email) return;
    const result = recordReferral(user.email, entryCode.trim().toUpperCase());
    if (result.success) {
      setEntryStatus("success");
      setEntryMessage("Code applied! You both earned 100 points!");
    } else {
      setEntryStatus("error");
      setEntryMessage(result.error ?? "Invalid code");
    }
  }, [entryCode, user?.email]);

  // ---------------------------------------------------------------------------
  // Auth guard
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#14b8a6] border-t-transparent" />
      </div>
    );
  }

  if (!user?.email) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Card className="border-white/10 bg-white/5">
          <CardContent className="py-12 text-center">
            <p className="text-white/60">Sign in to access the Referral Program</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Back link */}
      <Link
        href="/my"
        className="mb-6 inline-flex items-center text-sm text-white/50 hover:text-white/70 transition-colors"
      >
        &larr; Back to My Dashboard
      </Link>

      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Gift className="h-8 w-8 text-[#14b8a6]" />
          Referral Program
        </h1>
        <p className="mt-2 text-white/60">
          Share WCCG 104.5 FM with your friends and earn 100 points per signup!
        </p>
      </div>

      {/* Stats Row */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <Card className="border-[#14b8a6]/20 bg-[#14b8a6]/5">
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-[#14b8a6]">{displayReferralCount}</p>
            <p className="text-xs text-white/50">Total Referrals</p>
          </CardContent>
        </Card>
        <Card className="border-[#14b8a6]/20 bg-[#14b8a6]/5">
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-[#14b8a6]">{displayPointsEarned}</p>
            <p className="text-xs text-white/50">Points Earned</p>
          </CardContent>
        </Card>
      </div>

      {/* Referral Code Card */}
      <Card className="mb-6 border-[#14b8a6]/20 bg-gradient-to-br from-[#14b8a6]/15 via-white/5 to-[#14b8a6]/5">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            Your Referral Code
            <Badge variant="secondary" className="bg-[#14b8a6]/20 text-[#14b8a6] text-xs">
              100 pts per signup
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Large code */}
          <div
            onClick={handleCopy}
            className="cursor-pointer rounded-xl border-2 border-dashed border-[#14b8a6]/40 bg-[#14b8a6]/10 px-6 py-4 text-center transition-colors hover:border-[#14b8a6]/60 hover:bg-[#14b8a6]/15"
          >
            <p className="text-2xl font-bold tracking-wider text-white font-mono">{code}</p>
            <p className="mt-1 text-xs text-white/50">
              {copied ? "Copied!" : "Click to copy code"}
            </p>
          </div>

          {/* Referral link */}
          <div className="rounded-lg border border-white/10 bg-black/30 p-3">
            <p className="text-xs text-white/40 mb-1">Referral Link</p>
            <p className="text-sm text-[#14b8a6] font-mono break-all">{referralUrl}</p>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-3">
            <Button
              onClick={handleCopy}
              variant="outline"
              className="border-[#14b8a6]/30 text-[#14b8a6] hover:bg-[#14b8a6]/10"
            >
              {copied ? (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Copied!
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Copy className="h-4 w-4" /> Copy Link
                </span>
              )}
            </Button>
            <Button
              onClick={handleShare}
              className="bg-[#14b8a6] hover:bg-[#14b8a6]/80 text-white"
            >
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
            <Button
              onClick={() => setShowQr(!showQr)}
              variant="outline"
              className="border-white/10 text-white/60 hover:bg-white/10"
            >
              <QrCode className="h-4 w-4 mr-1" />
              QR Code
            </Button>
          </div>

          {/* QR Code */}
          {showQr && (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-[#14b8a6]/20 bg-white/5 p-4">
              <div className="rounded-lg bg-white p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrUrl}
                  alt="Referral QR Code"
                  width={200}
                  height={200}
                  className="h-[200px] w-[200px]"
                />
              </div>
              <p className="text-xs text-white/40">Scan to sign up with your referral link</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Apply a Referral Code */}
      <Card className="mb-6 border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-white/60" />
            Have a Referral Code?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-white/60">
            If someone referred you, enter their code below. You&apos;ll both earn 100 bonus points!
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={entryCode}
              onChange={(e) => {
                setEntryCode(e.target.value.toUpperCase());
                setEntryStatus("idle");
                setEntryMessage("");
              }}
              placeholder="Enter referral code"
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white uppercase font-mono placeholder:text-white/30 focus:border-[#14b8a6] focus:outline-none focus:ring-1 focus:ring-[#14b8a6]"
              disabled={entryStatus === "success"}
            />
            <Button
              onClick={handleApplyCode}
              disabled={!entryCode.trim() || entryStatus === "success"}
              className="bg-[#14b8a6] hover:bg-[#14b8a6]/80 text-white font-semibold"
            >
              Apply Code
            </Button>
          </div>
          {entryMessage && (
            <div
              className={`rounded-lg px-4 py-3 text-sm ${
                entryStatus === "success"
                  ? "bg-[#14b8a6]/10 border border-[#14b8a6]/20 text-[#14b8a6]"
                  : "bg-red-500/10 border border-red-500/20 text-red-400"
              }`}
            >
              {entryMessage}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Your Referrals List */}
      <Card className="mb-6 border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-[#14b8a6]" />
            Your Referrals
            <Badge variant="secondary" className="bg-[#14b8a6]/20 text-[#14b8a6] text-xs">
              {MOCK_REFERRAL_SIGNUPS.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {MOCK_REFERRAL_SIGNUPS.length === 0 ? (
            <p className="text-sm text-white/40 text-center py-6">
              No referrals yet. Share your code to get started!
            </p>
          ) : (
            <div className="space-y-2">
              {MOCK_REFERRAL_SIGNUPS.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#14b8a6]/20 shrink-0">
                    <Users className="h-4 w-4 text-[#14b8a6]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{r.name}</p>
                    <p className="text-xs text-white/40 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(r.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="bg-[#14b8a6]/20 text-[#14b8a6] text-xs shrink-0"
                  >
                    <Star className="h-3 w-3 mr-1" />+{r.points} pts
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card className="mb-6 border-white/10 bg-white/5">
        <CardContent className="py-6">
          <h3 className="text-lg font-semibold text-white mb-4">How It Works</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#14b8a6]/20">
                <span className="text-xl font-bold text-[#14b8a6]">1</span>
              </div>
              <h4 className="font-semibold text-white text-sm">Share Your Code</h4>
              <p className="mt-1 text-xs text-white/50">
                Copy your unique referral code or share the link with friends
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#14b8a6]/20">
                <span className="text-xl font-bold text-[#14b8a6]">2</span>
              </div>
              <h4 className="font-semibold text-white text-sm">Friend Signs Up</h4>
              <p className="mt-1 text-xs text-white/50">
                Your friend creates an account using your referral link
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#14b8a6]/20">
                <span className="text-xl font-bold text-[#14b8a6]">3</span>
              </div>
              <h4 className="font-semibold text-white text-sm">Earn 100 Points</h4>
              <p className="mt-1 text-xs text-white/50">
                You earn 100 bonus points for each friend that signs up
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card className="border-white/10 bg-white/5">
        <CardContent className="py-6">
          <h3 className="text-lg font-semibold text-white mb-4">FAQ</h3>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-white">How many friends can I refer?</h4>
              <p className="mt-1 text-xs text-white/50">
                There&apos;s no limit! Refer as many friends as you want and earn 100 points for each one.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Can I use my own code?</h4>
              <p className="mt-1 text-xs text-white/50">
                No, you cannot apply your own referral code. It must be from another user.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">When do I get my points?</h4>
              <p className="mt-1 text-xs text-white/50">
                Points are awarded instantly when a friend signs up using your referral link or code.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">What is the referral link format?</h4>
              <p className="mt-1 text-xs text-white/50">
                Your referral link looks like: {typeof window !== "undefined" ? window.location.origin : ""}/register?ref=YOUR_CODE
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
