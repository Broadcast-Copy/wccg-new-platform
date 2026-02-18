"use client";

import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Heart,
  LayoutDashboard,
  LogOut,
  Star,
  Ticket,
} from "lucide-react";
import { toast } from "sonner";

export function UserMenu() {
  const { user, signOut, isLoading } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/login">Sign In</Link>
        </Button>
        <Button size="sm" asChild>
          <Link href="/register">Sign Up</Link>
        </Button>
      </div>
    );
  }

  const displayName =
    user.user_metadata?.display_name ||
    user.email?.split("@")[0] ||
    "User";

  const initials = displayName.slice(0, 2).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
    router.push("/login");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex flex-col space-y-0.5">
            <p className="text-sm font-medium">{displayName}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/my">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            My Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/my/favorites">
            <Heart className="mr-2 h-4 w-4" />
            My Favorites
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/my/points">
            <Star className="mr-2 h-4 w-4" />
            My Points
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/my/tickets">
            <Ticket className="mr-2 h-4 w-4" />
            My Tickets
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
