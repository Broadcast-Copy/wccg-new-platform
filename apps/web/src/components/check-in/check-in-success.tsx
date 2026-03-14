"use client";

import { useEffect } from "react";

interface CheckInSuccessProps {
  eventName: string;
  pointsAwarded: number;
  onDismiss: () => void;
}

export function CheckInSuccess({
  eventName,
  pointsAwarded,
  onDismiss,
}: CheckInSuccessProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-2xl"
        style={{
          animation: "checkin-scale-in 0.3s ease-out forwards",
        }}
      >
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold mb-2">You checked in!</h2>
        <p className="text-muted-foreground mb-4">{eventName}</p>
        <div className="inline-flex items-center gap-2 rounded-full bg-[#74ddc7]/10 border border-[#74ddc7]/30 px-4 py-2">
          <span className="text-lg">⭐</span>
          <span className="text-lg font-bold text-[#74ddc7]">
            +{pointsAwarded.toLocaleString()} pts
          </span>
        </div>
        <p className="mt-4 text-xs text-muted-foreground/60">
          Auto-dismissing in 3 seconds...
        </p>

        <style>{`
          @keyframes checkin-scale-in {
            0% {
              opacity: 0;
              transform: scale(0.8);
            }
            100% {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}</style>
      </div>
    </div>
  );
}
