"use client";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Check } from "lucide-react";
import type { CheckInLocation } from "@/data/check-in-locations";

function formatDistance(meters: number): string {
  const miles = meters / 1609.34;
  if (miles < 0.1) return `${Math.round(meters)} ft`;
  return `${miles.toFixed(1)} mi`;
}

interface CheckInCardProps {
  location: CheckInLocation;
  distanceMeters: number | null;
  alreadyCheckedIn: boolean;
  onCheckIn: (location: CheckInLocation) => void;
  onDemoCheckIn: (location: CheckInLocation) => void;
}

export function CheckInCard({
  location,
  distanceMeters,
  alreadyCheckedIn,
  onCheckIn,
  onDemoCheckIn,
}: CheckInCardProps) {
  const isWithinRange = distanceMeters !== null && distanceMeters <= 200;

  return (
    <Card className="group h-full overflow-hidden transition-all hover:shadow-md hover:border-[#7401df]/30">
      <CardContent className="flex h-full flex-col gap-3 p-5">
        {/* Top: name + distance */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold leading-tight">{location.name}</h3>
            <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{location.address}</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {distanceMeters !== null && (
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  isWithinRange
                    ? "border-[#74ddc7]/30 bg-[#74ddc7]/10 text-[#74ddc7]"
                    : "border-border"
                }`}
              >
                {formatDistance(distanceMeters)}
              </Badge>
            )}
            {isWithinRange && !alreadyCheckedIn && (
              <Badge className="text-[10px] bg-[#74ddc7]/10 text-[#74ddc7] border border-[#74ddc7]/30">
                In Range!
              </Badge>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-[12px] leading-relaxed text-muted-foreground line-clamp-2 flex-1">
          {location.description}
        </p>

        {/* Footer: points + action */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            <span className="text-lg">⭐</span>
            <span className="text-sm font-bold tabular-nums">{location.points.toLocaleString()}</span>
            <span className="text-[11px] text-muted-foreground">pts</span>
          </div>

          {alreadyCheckedIn ? (
            <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 gap-1">
              <Check className="h-3 w-3" />
              Checked In
            </Badge>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-xs px-3"
                onClick={() => onDemoCheckIn(location)}
              >
                Demo Check In
              </Button>
              <Button
                size="sm"
                className="bg-[#7401df] hover:bg-[#7401df]/90 text-white text-xs px-4"
                disabled={!isWithinRange}
                onClick={() => onCheckIn(location)}
              >
                Check In
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
