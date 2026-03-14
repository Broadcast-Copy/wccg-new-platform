"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { Deal } from "@/data/deals";

interface DealRedemptionProps {
  deal: Deal;
  onClose: () => void;
}

export function DealRedemption({ deal, onClose }: DealRedemptionProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Purple gradient header */}
      <div className="relative bg-gradient-to-br from-[#7401df] via-[#7401df]/90 to-[#5000a0] px-6 py-10 text-center text-white">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <span className="text-5xl mb-3 block">{deal.icon}</span>
        <h1 className="text-2xl font-bold">{deal.businessName}</h1>
        <p className="mt-1 text-sm text-white/60">WCCG 104.5 FM Exclusive Offer</p>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
        {/* Offer text */}
        <div className="text-center">
          <p className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
            {deal.offer}
          </p>
          <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto">
            {deal.description}
          </p>
        </div>

        {/* Mock barcode / QR placeholder */}
        <div className="w-full max-w-xs">
          <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-8 text-center">
            <div className="flex justify-center gap-[2px] mb-3">
              {/* Mock barcode lines */}
              {Array.from({ length: 30 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-foreground/80 rounded-sm"
                  style={{
                    width: `${Math.random() > 0.5 ? 3 : 2}px`,
                    height: `${40 + Math.random() * 20}px`,
                  }}
                />
              ))}
            </div>
            <p className="text-xs font-mono text-muted-foreground tracking-widest">
              WCCG-{deal.id.replace("deal_", "").toUpperCase()}-2026
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="rounded-xl bg-[#74ddc7]/5 border border-[#74ddc7]/20 px-5 py-3 text-center">
          <p className="text-sm font-medium text-[#74ddc7]">
            Show this to the cashier
          </p>
        </div>
      </div>

      {/* Close button */}
      <div className="px-6 pb-8 pt-4">
        <Button
          onClick={onClose}
          className="w-full bg-[#7401df] hover:bg-[#7401df]/90 text-white"
          size="lg"
        >
          Close
        </Button>
      </div>
    </div>
  );
}
