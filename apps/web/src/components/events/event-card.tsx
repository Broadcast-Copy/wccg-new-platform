import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Calendar, MapPin } from "lucide-react";

interface EventCardProps {
  eventId: string;
  title: string;
  description?: string;
  date: string;
  venue?: string;
  imageUrl?: string;
  ticketPrice?: string;
  isSoldOut?: boolean;
}

export function EventCard({
  eventId,
  title,
  description,
  date,
  venue,
  ticketPrice,
  isSoldOut = false,
}: EventCardProps) {
  return (
    <Link href={`/events/${eventId}`}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">{title}</CardTitle>
            {isSoldOut ? (
              <Badge variant="secondary">Sold Out</Badge>
            ) : (
              ticketPrice && <Badge variant="outline">{ticketPrice}</Badge>
            )}
          </div>
          {description && (
            <CardDescription className="line-clamp-2">
              {description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{date}</span>
          </div>
          {venue && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{venue}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
