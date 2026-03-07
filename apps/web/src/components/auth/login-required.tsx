"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { LogIn, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LoginRequiredProps {
  children: React.ReactNode;
  /** Optional message to display above the sign-in button */
  message?: string;
  /** If true, wraps the gate in a card-style container. Default: true */
  card?: boolean;
  /** If true, renders as a full-page gate (centered). Default: false */
  fullPage?: boolean;
}

/**
 * Wraps content that requires authentication.
 * Shows a sign-in prompt when not logged in; renders children when authenticated.
 */
export function LoginRequired({
  children,
  message = "Sign in to access this feature",
  card = true,
  fullPage = false,
}: LoginRequiredProps) {
  const { user, isLoading } = useAuth();

  // Loading state
  if (isLoading) {
    if (fullPage) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-[#7401df]" />
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#7401df]" />
      </div>
    );
  }

  // Authenticated — render children
  if (user) {
    return <>{children}</>;
  }

  // Not authenticated — show sign-in prompt
  const prompt = (
    <div className="text-center space-y-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#7401df]/10 mx-auto">
        <LogIn className="h-7 w-7 text-[#7401df]" />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-lg font-semibold text-foreground">
          Sign In Required
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          {message}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Button
          asChild
          className="rounded-full bg-[#7401df] text-white hover:bg-[#5c00b3] gap-2 px-6"
        >
          <Link href="/login">
            <LogIn className="h-4 w-4" />
            Sign In
          </Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full px-6">
          <Link href="/register">Create Account</Link>
        </Button>
      </div>
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        {card ? (
          <div className="rounded-xl border border-border bg-card p-8 sm:p-12 max-w-md w-full">
            {prompt}
          </div>
        ) : (
          prompt
        )}
      </div>
    );
  }

  if (card) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 sm:p-12">
        {prompt}
      </div>
    );
  }

  return prompt;
}
