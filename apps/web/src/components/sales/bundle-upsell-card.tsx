"use client";

import { type AdBundle } from "@/data/bundles";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

interface BundleUpsellCardProps {
  bundle: AdBundle;
}

export function BundleUpsellCard({ bundle }: BundleUpsellCardProps) {
  return (
    <div
      className={`relative flex flex-col rounded-xl border transition-all ${
        bundle.isPopular
          ? "border-[#7401df]/50 bg-gradient-to-b from-[#7401df]/5 to-transparent shadow-lg shadow-[#7401df]/10"
          : "border-border bg-card hover:border-input"
      }`}
    >
      {/* Popular ribbon */}
      {bundle.isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-[#7401df] text-white border-0 px-3 py-0.5 text-xs font-bold shadow-md">
            Most Popular
          </Badge>
        </div>
      )}

      <div className="flex flex-1 flex-col p-6 pt-8">
        {/* Tier name & description */}
        <div className="mb-4">
          <h3 className="text-lg font-bold text-foreground">{bundle.name}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {bundle.description}
          </p>
        </div>

        {/* Price */}
        <div className="mb-5">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-foreground">
              ${bundle.price.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground">
              {bundle.spotCount} ad spots
            </span>
            {bundle.savings && (
              <Badge
                variant="outline"
                className="border-[#74ddc7]/30 bg-[#74ddc7]/10 text-[#74ddc7] text-[10px]"
              >
                {bundle.savings}
              </Badge>
            )}
          </div>
        </div>

        {/* Features list */}
        <ul className="flex-1 space-y-2.5 mb-6">
          {bundle.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <Check
                className={`h-4 w-4 shrink-0 mt-0.5 ${
                  bundle.isPopular ? "text-[#7401df]" : "text-[#74ddc7]"
                }`}
              />
              <span className="text-sm text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <Button
          className={`w-full rounded-full font-bold ${
            bundle.isPopular
              ? "bg-[#7401df] text-white hover:bg-[#7401df]/90"
              : "bg-foreground/10 text-foreground hover:bg-foreground/20"
          }`}
        >
          {bundle.ctaText}
        </Button>
      </div>
    </div>
  );
}
