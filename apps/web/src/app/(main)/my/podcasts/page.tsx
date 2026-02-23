"use client";

import Link from "next/link";
import { Mic, Radio, ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function MyPodcastsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Podcasts</h1>
        <p className="text-muted-foreground">
          Create and manage your podcast episodes
        </p>
      </div>

      {/* Coming Soon Card */}
      <Card className="border-dashed">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#7401df]/10">
            <Mic className="h-10 w-10 text-[#7401df]" />
          </div>
          <CardTitle className="mt-4 text-xl">Coming Soon</CardTitle>
          <CardDescription className="mx-auto max-w-md text-base">
            Podcast creation tools are coming soon! You&apos;ll be able to
            record, edit, and publish podcasts directly from your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 pb-8">
          <div className="grid gap-3 text-center text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-[#74ddc7]" />
              Record directly in your browser
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-[#74ddc7]" />
              Edit and trim your episodes
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-[#74ddc7]" />
              Publish to all major podcast platforms
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-[#74ddc7]" />
              Track listener analytics
            </div>
          </div>

          <div className="mt-4">
            <Link href="/channels">
              <Button variant="outline" className="gap-2">
                <Radio className="h-4 w-4" />
                Browse Channels
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
