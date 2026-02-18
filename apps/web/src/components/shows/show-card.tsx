import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface ShowCardProps {
  showId: string;
  title: string;
  description?: string;
  hostName?: string;
  schedule?: string;
  imageUrl?: string;
  genre?: string;
}

export function ShowCard({
  showId,
  title,
  description,
  hostName,
  schedule,
  genre,
}: ShowCardProps) {
  return (
    <Link href={`/shows/${showId}`}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">{title}</CardTitle>
            {genre && <Badge variant="secondary">{genre}</Badge>}
          </div>
          {description && (
            <CardDescription className="line-clamp-2">
              {description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {hostName && (
            <p className="text-sm text-muted-foreground">
              Hosted by {hostName}
            </p>
          )}
          {schedule && (
            <p className="text-xs text-muted-foreground">{schedule}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
