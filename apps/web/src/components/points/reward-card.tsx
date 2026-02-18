import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";

interface RewardCardProps {
  rewardId: string;
  title: string;
  description?: string;
  pointsCost: number;
  imageUrl?: string;
  available?: boolean;
  onRedeem?: (rewardId: string) => void;
}

export function RewardCard({
  rewardId,
  title,
  description,
  pointsCost,
  available = true,
  onRedeem,
}: RewardCardProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <Badge variant="outline" className="flex items-center gap-1">
            <Star className="h-3 w-3" />
            {pointsCost}
          </Badge>
        </div>
        {description && (
          <CardDescription className="line-clamp-2">
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <Button
          className="w-full"
          disabled={!available}
          onClick={() => onRedeem?.(rewardId)}
        >
          {available ? "Redeem" : "Unavailable"}
        </Button>
      </CardContent>
    </Card>
  );
}
