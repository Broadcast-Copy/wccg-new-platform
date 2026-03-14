"use client";

import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { BirthdaySetup } from "@/components/birthday/birthday-setup";
import Link from "next/link";

export default function BirthdayPage() {
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
            <p className="text-white/60">Sign in to join the Birthday Club</p>
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
          <span className="mr-2">🎂</span>Birthday Club
        </h1>
        <p className="mt-2 text-white/60">
          Set your birthday and get rewarded on your special day!
        </p>
      </div>

      {/* Birthday Setup Form */}
      <BirthdaySetup email={user.email} />

      {/* Info Card */}
      <Card className="mt-6 border-white/10 bg-gradient-to-br from-[#74ddc7]/10 via-white/5 to-[#7401df]/10">
        <CardContent className="py-6">
          <h3 className="text-lg font-semibold text-white mb-3">How It Works</h3>
          <ul className="space-y-3 text-sm text-white/70">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#7401df]/30 text-xs text-[#74ddc7]">1</span>
              <span>Set your birthday month and day above</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#7401df]/30 text-xs text-[#74ddc7]">2</span>
              <span>On your birthday, you&apos;ll receive <strong className="text-[#74ddc7]">50 bonus points</strong> automatically</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#7401df]/30 text-xs text-[#74ddc7]">3</span>
              <span>Optionally request an on-air shoutout from the WCCG team!</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
