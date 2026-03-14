"use client";

import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { NotificationPreferences } from "@/components/notifications/notification-preferences";
import Link from "next/link";

export default function NotificationPreferencesPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#74ddc7] border-t-transparent" />
      </div>
    );
  }

  if (!user?.email) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Card className="border-white/10 bg-white/5">
          <CardContent className="py-12 text-center">
            <p className="text-white/60">Sign in to manage notification preferences</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Back link */}
      <Link
        href="/my/notifications"
        className="mb-6 inline-flex items-center text-sm text-white/50 hover:text-white/70 transition-colors"
      >
        &larr; Back to Notifications
      </Link>

      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">
          <span className="mr-2">🔔</span>Notification Preferences
        </h1>
        <p className="mt-2 text-white/60">
          Choose which notifications you want to receive from WCCG 104.5 FM.
        </p>
      </div>

      {/* Preferences Component */}
      <NotificationPreferences email={user.email} />
    </div>
  );
}
