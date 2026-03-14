import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { SponsorBadge } from "./sponsor-badge";

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Food & Drinks": { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", border: "border-orange-500/20" },
  "Event Tickets": { bg: "bg-violet-500/10", text: "text-violet-600 dark:text-violet-400", border: "border-violet-500/20" },
  "Merch & Gear": { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/20" },
  "Digital Perks": { bg: "bg-cyan-500/10", text: "text-cyan-600 dark:text-cyan-400", border: "border-cyan-500/20" },
  "Gift Cards": { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20" },
  "Experiences": { bg: "bg-pink-500/10", text: "text-pink-600 dark:text-pink-400", border: "border-pink-500/20" },
  "Community": { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/20" },
};

interface RewardCardProps {
  rewardId: string;
  title: string;
  description?: string;
  icon?: string;
  pointsCost: number;
  category?: string;
  stockCount?: number;
  imageUrl?: string;
  available?: boolean;
  sponsor?: { name: string; logo?: string };
  onRedeem?: (rewardId: string) => void;
}

export function RewardCard({
  rewardId,
  title,
  description,
  icon,
  pointsCost,
  category,
  stockCount,
  available = true,
  sponsor,
  onRedeem,
}: RewardCardProps) {
  const colors = category ? CATEGORY_COLORS[category] : undefined;
  const isLimited = stockCount !== undefined && stockCount !== null && stockCount > 0 && stockCount <= 10;

  return (
    <Card className="group h-full overflow-hidden transition-all hover:shadow-md hover:border-[#7401df]/30">
      <CardContent className="flex h-full flex-col gap-3 p-5">
        {/* Top: emoji + category badge */}
        <div className="flex items-start justify-between">
          <span className="text-4xl leading-none" role="img" aria-label={title}>
            {icon || "\uD83C\uDF81"}
          </span>
          <div className="flex flex-col items-end gap-1">
            {category && colors && (
              <Badge
                variant="outline"
                className={`text-[10px] ${colors.bg} ${colors.text} ${colors.border}`}
              >
                {category}
              </Badge>
            )}
            {isLimited && (
              <Badge variant="outline" className="text-[10px] border-red-500/30 bg-red-500/10 text-red-500">
                Limited!
              </Badge>
            )}
          </div>
        </div>

        {/* Sponsor badge */}
        {sponsor && (
          <SponsorBadge sponsorName={sponsor.name} sponsorLogo={sponsor.logo} />
        )}

        {/* Title & description */}
        <div className="flex-1">
          <h3 className="text-sm font-semibold leading-tight">{title}</h3>
          {description && (
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground line-clamp-2">
              {description}
            </p>
          )}
        </div>

        {/* Footer: points + redeem */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            <Star className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-bold tabular-nums">{pointsCost.toLocaleString()}</span>
            <span className="text-[11px] text-muted-foreground">pts</span>
          </div>
          {pointsCost > 0 && (
            <Button
              size="sm"
              className={
                available
                  ? "bg-[#7401df] hover:bg-[#7401df]/90 text-white text-xs px-4"
                  : "text-xs px-4"
              }
              variant={available ? "default" : "outline"}
              disabled={!available}
              onClick={() => onRedeem?.(rewardId)}
            >
              {available ? "Redeem" : "Not enough pts"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
