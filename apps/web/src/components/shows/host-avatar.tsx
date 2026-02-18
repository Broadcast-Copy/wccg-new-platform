import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";

interface HostAvatarProps {
  hostId: string;
  name: string;
  imageUrl?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
};

export function HostAvatar({
  hostId,
  name,
  size = "md",
}: HostAvatarProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Link
      href={`/hosts/${hostId}`}
      className="flex items-center gap-2 transition-opacity hover:opacity-80"
    >
      <Avatar className={sizeClasses[size]}>
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <span className="text-sm font-medium">{name}</span>
    </Link>
  );
}
