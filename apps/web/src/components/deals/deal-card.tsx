"use client";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Deal } from "@/data/deals";

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Food: { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", border: "border-orange-500/20" },
  Services: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/20" },
  Auto: { bg: "bg-slate-500/10", text: "text-slate-600 dark:text-slate-400", border: "border-slate-500/20" },
  Beauty: { bg: "bg-pink-500/10", text: "text-pink-600 dark:text-pink-400", border: "border-pink-500/20" },
  Entertainment: { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", border: "border-purple-500/20" },
};

function formatDistance(meters: number): string {
  const miles = meters / 1609.34;
  if (miles < 0.1) return `${Math.round(meters)} ft`;
  return `${miles.toFixed(1)} mi`;
}

interface DealCardProps {
  deal: Deal;
  distanceMeters: number | null;
  onShowOffer: (deal: Deal) => void;
}

export function DealCard({ deal, distanceMeters, onShowOffer }: DealCardProps) {
  const isNearby =
    distanceMeters !== null && distanceMeters <= deal.nearbyThresholdMeters;
  const colors = CATEGORY_COLORS[deal.category];

  return (
    <Card className="group h-full overflow-hidden transition-all hover:shadow-md hover:border-[#7401df]/30">
      <CardContent className="flex h-full flex-col gap-3 p-5">
        {/* Top: emoji + badges */}
        <div className="flex items-start justify-between">
          <span className="text-4xl leading-none" role="img" aria-label={deal.businessName}>
            {deal.icon}
          </span>
          <div className="flex flex-col items-end gap-1">
            {colors && (
              <Badge
                variant="outline"
                className={`text-[10px] ${colors.bg} ${colors.text} ${colors.border}`}
              >
                {deal.category}
              </Badge>
            )}
            {isNearby && (
              <Badge className="text-[10px] bg-[#74ddc7]/10 text-[#74ddc7] border border-[#74ddc7]/30">
                Nearby!
              </Badge>
            )}
          </div>
        </div>

        {/* Business name + offer */}
        <div className="flex-1">
          <h3 className="text-sm font-semibold leading-tight">{deal.businessName}</h3>
          <p className="mt-1 text-[13px] font-bold text-[#74ddc7]">{deal.offer}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground line-clamp-2">
            {deal.description}
          </p>
        </div>

        {/* Footer: distance + show offer */}
        <div className="flex items-center justify-between pt-1">
          {distanceMeters !== null ? (
            <span className="text-xs text-muted-foreground">
              {formatDistance(distanceMeters)}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">--</span>
          )}
          <Button
            size="sm"
            className="bg-[#7401df] hover:bg-[#7401df]/90 text-white text-xs px-4"
            onClick={() => onShowOffer(deal)}
          >
            Show Offer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
