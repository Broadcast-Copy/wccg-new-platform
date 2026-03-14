"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { isBirthdayToday, awardBirthdayPoints, loadBirthday } from "@/lib/birthday";
import Link from "next/link";

interface BirthdayCardProps {
  email: string;
}

export function BirthdayCard({ email }: BirthdayCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [name, setName] = useState("");
  const [pointsAwarded, setPointsAwarded] = useState(false);

  useEffect(() => {
    if (!email) return;

    if (isBirthdayToday(email)) {
      setIsVisible(true);
      const data = loadBirthday(email);
      if (data?.shoutoutName) {
        setName(data.shoutoutName);
      }
      // Auto-award birthday points
      const awarded = awardBirthdayPoints(email);
      setPointsAwarded(awarded);
    }
  }, [email]);

  if (!isVisible) return null;

  return (
    <Card className="relative overflow-hidden border-amber-500/30 bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-orange-500/20">
      {/* Decorative dots (confetti-like) */}
      <div className="absolute top-2 left-4 h-2 w-2 rounded-full bg-amber-400/60 animate-pulse" />
      <div className="absolute top-6 right-8 h-1.5 w-1.5 rounded-full bg-yellow-300/50 animate-pulse" style={{ animationDelay: "0.5s" }} />
      <div className="absolute bottom-4 left-12 h-2 w-2 rounded-full bg-orange-400/40 animate-pulse" style={{ animationDelay: "1s" }} />
      <div className="absolute top-3 right-20 h-1 w-1 rounded-full bg-amber-300/70 animate-pulse" style={{ animationDelay: "0.3s" }} />
      <div className="absolute bottom-6 right-6 h-2.5 w-2.5 rounded-full bg-yellow-400/50 animate-pulse" style={{ animationDelay: "0.7s" }} />
      <div className="absolute top-10 left-20 h-1.5 w-1.5 rounded-full bg-orange-300/60 animate-pulse" style={{ animationDelay: "1.2s" }} />
      <div className="absolute bottom-3 left-32 h-1 w-1 rounded-full bg-amber-500/40 animate-pulse" style={{ animationDelay: "0.9s" }} />
      <div className="absolute top-8 right-32 h-2 w-2 rounded-full bg-yellow-500/30 animate-pulse" style={{ animationDelay: "1.5s" }} />

      <CardContent className="relative z-10 flex flex-col items-center py-6 text-center">
        <span className="text-4xl mb-3">🎂</span>
        <h3 className="text-xl font-bold text-amber-100">
          Happy Birthday{name ? `, ${name}` : ""}!
        </h3>
        <p className="mt-2 text-sm text-amber-200/80">
          {pointsAwarded
            ? "You earned 50 bonus points!"
            : "Your 50 bonus points have already been awarded today!"}
        </p>
        <p className="mt-1 text-xs text-amber-300/60">
          From your WCCG 104.5 FM family
        </p>
        <Link
          href="/my/birthday"
          className="mt-3 text-xs text-amber-400 hover:text-amber-300 underline underline-offset-2"
        >
          Manage Birthday Settings
        </Link>
      </CardContent>
    </Card>
  );
}
