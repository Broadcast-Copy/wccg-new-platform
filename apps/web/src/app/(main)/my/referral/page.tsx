"use client";

import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { ReferralCard } from "@/components/referral/referral-card";
import { ReferralEntry } from "@/components/referral/referral-entry";
import Link from "next/link";

export default function ReferralPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#74ddc7] border-t-transparent" />
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
        <h1 className="text-3xl font-bold text-white">
          <span className="mr-2">🎁</span>Invite Friends, Earn Points
        </h1>
        <p className="mt-2 text-white/60">
          Share WCCG 104.5 FM with your friends and both earn 500 bonus points!
        </p>
      </div>

      {/* Referral Card */}
      <ReferralCard email={user.email} />

      {/* Referral Entry */}
      <div className="mt-6">
        <ReferralEntry email={user.email} />
      </div>

      {/* How It Works */}
      <Card className="mt-6 border-white/10 bg-white/5">
        <CardContent className="py-6">
          <h3 className="text-lg font-semibold text-white mb-4">How It Works</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#7401df]/30">
                <span className="text-xl">1</span>
              </div>
              <h4 className="font-semibold text-white text-sm">Share Your Code</h4>
              <p className="mt-1 text-xs text-white/50">
                Copy your unique referral code or share link with friends
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#7401df]/30">
                <span className="text-xl">2</span>
              </div>
              <h4 className="font-semibold text-white text-sm">Friend Signs Up</h4>
              <p className="mt-1 text-xs text-white/50">
                Your friend creates an account and enters your code
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#7401df]/30">
                <span className="text-xl">3</span>
              </div>
              <h4 className="font-semibold text-white text-sm">Both Get 500 pts</h4>
              <p className="mt-1 text-xs text-white/50">
                You and your friend each earn 500 bonus points instantly
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card className="mt-6 border-white/10 bg-white/5">
        <CardContent className="py-6">
          <h3 className="text-lg font-semibold text-white mb-4">FAQ</h3>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-white">How many friends can I refer?</h4>
              <p className="mt-1 text-xs text-white/50">
                There&apos;s no limit! Refer as many friends as you want and earn 500 points for each one.
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
                Points are awarded instantly when a friend applies your code.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Can I use multiple referral codes?</h4>
              <p className="mt-1 text-xs text-white/50">
                No, you can only apply one referral code per account.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
