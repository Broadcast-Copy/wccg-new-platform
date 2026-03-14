"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { loadPrefs, savePrefs } from "@/lib/notification-preferences";
import type { NotificationPrefs } from "@/lib/notification-preferences";
import { ALL_SHOWS } from "@/data/shows";
import { ALL_HOSTS } from "@/data/hosts";

interface NotificationPreferencesProps {
  email: string;
}

export function NotificationPreferences({ email }: NotificationPreferencesProps) {
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!email) return;
    setPrefs(loadPrefs(email));
  }, [email]);

  if (!prefs) return null;

  function updateCategory(key: keyof NotificationPrefs["categories"], value: boolean) {
    setPrefs((prev) => {
      if (!prev) return prev;
      return { ...prev, categories: { ...prev.categories, [key]: value } };
    });
  }

  function updateShow(showId: string, value: boolean) {
    setPrefs((prev) => {
      if (!prev) return prev;
      return { ...prev, shows: { ...prev.shows, [showId]: value } };
    });
  }

  function updateHost(hostId: string, value: boolean) {
    setPrefs((prev) => {
      if (!prev) return prev;
      return { ...prev, hosts: { ...prev.hosts, [hostId]: value } };
    });
  }

  function handleSave() {
    if (!prefs) return;
    savePrefs(email, prefs);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  // Filter to active, non-news shows for notification purposes
  const notifiableShows = ALL_SHOWS.filter(
    (s) => s.isActive && s.id !== "show_abc_news",
  );

  // Filter to active hosts with at least one show
  const notifiableHosts = ALL_HOSTS.filter(
    (h) => h.isActive && h.showIds.length > 0,
  );

  const categoryLabels: { key: keyof NotificationPrefs["categories"]; label: string; description: string }[] = [
    { key: "contests", label: "Contests", description: "Keyword contests, giveaways, and prize alerts" },
    { key: "points", label: "Points Milestones", description: "When you hit point milestones and earn rewards" },
    { key: "events", label: "Events", description: "Station events, live broadcasts, and community gatherings" },
    { key: "news", label: "Breaking News", description: "Important station announcements and breaking news" },
  ];

  return (
    <div className="space-y-6">
      {/* Categories */}
      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle className="text-lg text-white">Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {categoryLabels.map(({ key, label, description }) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-lg px-4 py-3 hover:bg-white/5 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="text-xs text-white/50">{description}</p>
              </div>
              <Switch
                checked={prefs.categories[key]}
                onCheckedChange={(val) => updateCategory(key, val)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Shows */}
      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle className="text-lg text-white">Shows</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 max-h-[400px] overflow-y-auto">
          {notifiableShows.map((show) => (
            <div
              key={show.id}
              className="flex items-center justify-between rounded-lg px-4 py-3 hover:bg-white/5 transition-colors"
            >
              <div className="mr-4">
                <p className="text-sm font-medium text-white">
                  Notify before {show.name}
                </p>
                <p className="text-xs text-white/50">
                  {show.days} &middot; {show.timeSlot}
                </p>
              </div>
              <Switch
                checked={prefs.shows[show.id] ?? false}
                onCheckedChange={(val) => updateShow(show.id, val)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Hosts */}
      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle className="text-lg text-white">Hosts &amp; DJs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 max-h-[400px] overflow-y-auto">
          {notifiableHosts.map((host) => (
            <div
              key={host.id}
              className="flex items-center justify-between rounded-lg px-4 py-3 hover:bg-white/5 transition-colors"
            >
              <div className="mr-4">
                <p className="text-sm font-medium text-white">{host.name}</p>
                <p className="text-xs text-white/50">{host.role}</p>
              </div>
              <Switch
                checked={prefs.hosts[host.id] ?? false}
                onCheckedChange={(val) => updateHost(host.id, val)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        className="w-full bg-[#7401df] hover:bg-[#7401df]/80 text-white"
        size="lg"
      >
        {saved ? "Preferences Saved!" : "Save Preferences"}
      </Button>
    </div>
  );
}
