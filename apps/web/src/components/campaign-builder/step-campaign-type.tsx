"use client";

import { useFormContext } from "react-hook-form";
import type { CampaignFormValues } from "./campaign-builder-types";
import { CAMPAIGN_TYPES } from "@/data/rate-card";
import { Card, CardContent } from "@/components/ui/card";
import { Radio, Globe, MapPin, Gift, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Icon lookup
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, LucideIcon> = {
  Radio,
  Globe,
  MapPin,
  Gift,
  Trophy,
};

// ---------------------------------------------------------------------------
// StepCampaignType — select the campaign category
// ---------------------------------------------------------------------------

export function StepCampaignType() {
  const { watch, setValue } = useFormContext<CampaignFormValues>();
  const selected = watch("campaignType");

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">
          Choose Campaign Type
        </h3>
        <p className="text-sm text-muted-foreground">
          Select the type of campaign you want to build.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CAMPAIGN_TYPES.map((ct) => {
          const Icon = ICON_MAP[ct.icon] ?? Radio;
          const isSelected = selected === ct.value;

          return (
            <Card
              key={ct.value}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              onClick={() => setValue("campaignType", ct.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setValue("campaignType", ct.value);
                }
              }}
              className={`cursor-pointer transition-colors ${
                isSelected
                  ? "border-[#74ddc7] bg-[#74ddc7]/10"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <CardContent className="flex flex-col items-start gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    isSelected
                      ? "bg-[#74ddc7]/20 text-[#74ddc7]"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{ct.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {ct.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
