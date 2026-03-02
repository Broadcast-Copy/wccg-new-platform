"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Palette,
  Radio,
  Bell,
  ToggleLeft,
  Plug,
  Wrench,
  Save,
  Eye,
  Trash2,
  RefreshCw,
  Download,
  ShieldCheck,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* -------------------------------------------------------------------------- */
/*  Station Branding State                                                    */
/* -------------------------------------------------------------------------- */

interface BrandingState {
  stationName: string;
  tagline: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  heroBannerUrl: string;
}

/* -------------------------------------------------------------------------- */
/*  Stream Configuration State                                                */
/* -------------------------------------------------------------------------- */

interface StreamState {
  primaryUrl: string;
  backupUrl: string;
  format: string;
  maxListeners: number;
  healthCheckInterval: string;
  enableRecording: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Notification & Email State                                                */
/* -------------------------------------------------------------------------- */

interface NotificationState {
  emailProvider: string;
  fromEmail: string;
  fromName: string;
  smtpHostOrApiKey: string;
  enableEmailNotifications: boolean;
  enablePushNotifications: boolean;
  categories: {
    newUserSignup: boolean;
    eventRegistration: boolean;
    contentReport: boolean;
    systemAlerts: boolean;
  };
}

/* -------------------------------------------------------------------------- */
/*  Feature Flags State                                                       */
/* -------------------------------------------------------------------------- */

interface FeatureFlag {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Integration State                                                         */
/* -------------------------------------------------------------------------- */

interface IntegrationState {
  apiBaseUrl: string;
  rateLimit: number;
  supabaseUrl: string;
  icecastUrl: string;
  youtubeApiKey: string;
  facebookAppId: string;
  googleAnalyticsId: string;
}

/* -------------------------------------------------------------------------- */
/*  Maintenance State                                                         */
/* -------------------------------------------------------------------------- */

interface MaintenanceState {
  systemStatus: "operational" | "maintenance";
  enableMaintenanceMode: boolean;
  maintenanceMessage: string;
  scheduledDate: string;
  scheduledTime: string;
}

/* ========================================================================== */
/*  Page Component                                                            */
/* ========================================================================== */

export default function SettingsPage() {
  /* ----- Branding ----- */
  const [branding, setBranding] = useState<BrandingState>({
    stationName: "WCCG 104.5 FM",
    tagline: "Carolina's #1 for Hip-Hop and R&B",
    logoUrl: "/images/wccg-logo.png",
    primaryColor: "#74ddc7",
    secondaryColor: "#7401df",
    heroBannerUrl: "/images/hero-banner.jpg",
  });

  /* ----- Stream ----- */
  const [stream, setStream] = useState<StreamState>({
    primaryUrl: "https://stream.wccg.fm/live",
    backupUrl: "https://backup.wccg.fm/live",
    format: "mp3-128",
    maxListeners: 1000,
    healthCheckInterval: "60",
    enableRecording: false,
  });

  /* ----- Notifications ----- */
  const [notifications, setNotifications] = useState<NotificationState>({
    emailProvider: "smtp",
    fromEmail: "noreply@wccg.fm",
    fromName: "WCCG 104.5 FM",
    smtpHostOrApiKey: "",
    enableEmailNotifications: true,
    enablePushNotifications: false,
    categories: {
      newUserSignup: true,
      eventRegistration: true,
      contentReport: true,
      systemAlerts: true,
    },
  });

  /* ----- Feature Flags ----- */
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([
    {
      key: "points_rewards",
      label: "Points & Rewards System",
      description:
        "Allow listeners to earn points from engagement and redeem rewards.",
      enabled: true,
    },
    {
      key: "dj_mix_uploads",
      label: "DJ Mix Uploads",
      description: "Enable DJs and users to upload and share mixed sets.",
      enabled: true,
    },
    {
      key: "podcast_system",
      label: "Podcast System",
      description:
        "Host and distribute podcasts through the platform.",
      enabled: true,
    },
    {
      key: "directory_listings",
      label: "Directory Listings",
      description:
        "Community business directory for local listings and services.",
      enabled: true,
    },
    {
      key: "advertiser_portal",
      label: "Advertiser Portal",
      description:
        "Self-serve advertising portal for campaign management.",
      enabled: true,
    },
    {
      key: "event_ticketing",
      label: "Event Ticketing",
      description: "Sell and manage tickets for station events.",
      enabled: true,
    },
    {
      key: "live_chat",
      label: "Live Chat",
      description:
        "Real-time chat during live broadcasts and shows.",
      enabled: false,
    },
    {
      key: "contest_system",
      label: "Contest System",
      description:
        "Run on-air and online contests with automated prize management.",
      enabled: false,
    },
    {
      key: "social_sharing",
      label: "Social Sharing",
      description:
        "Enable social share buttons and cross-posting to social platforms.",
      enabled: true,
    },
    {
      key: "music_submissions",
      label: "Music Submissions",
      description:
        "Allow independent artists to submit tracks for airplay consideration.",
      enabled: false,
    },
  ]);

  /* ----- Integrations ----- */
  const [integrations, setIntegrations] = useState<IntegrationState>({
    apiBaseUrl: "https://api.wccg.fm/api/v1",
    rateLimit: 120,
    supabaseUrl: "https://lmoqvvkhibfiwudgdopb.supabase.co",
    icecastUrl: "https://icecast.wccg.fm:8443",
    youtubeApiKey: "",
    facebookAppId: "",
    googleAnalyticsId: "G-XXXXXXXXXX",
  });

  /* ----- Maintenance ----- */
  const [maintenance, setMaintenance] = useState<MaintenanceState>({
    systemStatus: "operational",
    enableMaintenanceMode: false,
    maintenanceMessage:
      "We are currently performing scheduled maintenance. Please check back shortly.",
    scheduledDate: "2026-03-01",
    scheduledTime: "02:00",
  });

  /* ====================================================================== */
  /*  Helpers                                                               */
  /* ====================================================================== */

  function handleSave(section: string) {
    toast.success(`${section} saved`);
  }

  function handleAction(action: string) {
    toast.success(`${action} queued`);
  }

  function toggleFeatureFlag(key: string) {
    setFeatureFlags((prev) =>
      prev.map((f) => (f.key === key ? { ...f, enabled: !f.enabled } : f))
    );
  }

  /* ====================================================================== */
  /*  Render                                                                */
  /* ====================================================================== */

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground">
          Manage station branding, stream configuration, notifications, features,
          integrations, and maintenance.
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="branding" className="gap-1.5">
            <Palette className="size-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="stream" className="gap-1.5">
            <Radio className="size-4" />
            Stream
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5">
            <Bell className="size-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="features" className="gap-1.5">
            <ToggleLeft className="size-4" />
            Features
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-1.5">
            <Plug className="size-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-1.5">
            <Wrench className="size-4" />
            Maintenance
          </TabsTrigger>
        </TabsList>

        {/* ================================================================ */}
        {/*  TAB 1 — Station Branding                                        */}
        {/* ================================================================ */}
        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="size-5" />
                Station Branding
              </CardTitle>
              <CardDescription>
                Configure your station identity, colors, and visual assets.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Station Name */}
              <div className="grid gap-2">
                <Label htmlFor="station-name">Station Name</Label>
                <Input
                  id="station-name"
                  value={branding.stationName}
                  onChange={(e) =>
                    setBranding({ ...branding, stationName: e.target.value })
                  }
                  placeholder="WCCG 104.5 FM"
                />
              </div>

              {/* Tagline */}
              <div className="grid gap-2">
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  value={branding.tagline}
                  onChange={(e) =>
                    setBranding({ ...branding, tagline: e.target.value })
                  }
                  placeholder="Carolina's #1 for Hip-Hop and R&B"
                />
              </div>

              {/* Logo URL */}
              <div className="grid gap-2">
                <Label htmlFor="logo-url">Station Logo URL</Label>
                <Input
                  id="logo-url"
                  value={branding.logoUrl}
                  onChange={(e) =>
                    setBranding({ ...branding, logoUrl: e.target.value })
                  }
                  placeholder="/images/wccg-logo.png"
                />
                {branding.logoUrl && (
                  <div className="mt-2 flex items-center gap-3">
                    <Eye className="size-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Preview:
                    </span>
                    <div className="h-12 w-12 rounded-md border bg-muted flex items-center justify-center overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={branding.logoUrl}
                        alt="Logo preview"
                        className="h-full w-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Colors */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="primary-color">Primary Color</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="primary-color"
                      value={branding.primaryColor}
                      onChange={(e) =>
                        setBranding({
                          ...branding,
                          primaryColor: e.target.value,
                        })
                      }
                      placeholder="#74ddc7"
                      className="flex-1"
                    />
                    <div
                      className="h-9 w-9 shrink-0 rounded-md border"
                      style={{ backgroundColor: branding.primaryColor }}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="secondary-color">Secondary Color</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="secondary-color"
                      value={branding.secondaryColor}
                      onChange={(e) =>
                        setBranding({
                          ...branding,
                          secondaryColor: e.target.value,
                        })
                      }
                      placeholder="#7401df"
                      className="flex-1"
                    />
                    <div
                      className="h-9 w-9 shrink-0 rounded-md border"
                      style={{ backgroundColor: branding.secondaryColor }}
                    />
                  </div>
                </div>
              </div>

              {/* Hero Banner URL */}
              <div className="grid gap-2">
                <Label htmlFor="hero-banner-url">Hero Banner URL</Label>
                <Input
                  id="hero-banner-url"
                  value={branding.heroBannerUrl}
                  onChange={(e) =>
                    setBranding({ ...branding, heroBannerUrl: e.target.value })
                  }
                  placeholder="/images/hero-banner.jpg"
                />
              </div>

              {/* Save */}
              <div className="flex justify-end">
                <Button onClick={() => handleSave("Branding settings")}>
                  <Save className="size-4" />
                  Save Branding
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================ */}
        {/*  TAB 2 — Stream Configuration                                    */}
        {/* ================================================================ */}
        <TabsContent value="stream">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Radio className="size-5" />
                Stream Configuration
              </CardTitle>
              <CardDescription>
                Configure live stream endpoints, encoding, and health monitoring.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Primary Stream URL */}
              <div className="grid gap-2">
                <Label htmlFor="primary-stream-url">Primary Stream URL</Label>
                <Input
                  id="primary-stream-url"
                  value={stream.primaryUrl}
                  onChange={(e) =>
                    setStream({ ...stream, primaryUrl: e.target.value })
                  }
                  placeholder="https://stream.wccg.fm/live"
                />
              </div>

              {/* Backup Stream URL */}
              <div className="grid gap-2">
                <Label htmlFor="backup-stream-url">Backup Stream URL</Label>
                <Input
                  id="backup-stream-url"
                  value={stream.backupUrl}
                  onChange={(e) =>
                    setStream({ ...stream, backupUrl: e.target.value })
                  }
                  placeholder="https://backup.wccg.fm/live"
                />
              </div>

              {/* Format & Max Listeners */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="stream-format">Stream Format</Label>
                  <Select
                    value={stream.format}
                    onValueChange={(v) => setStream({ ...stream, format: v })}
                  >
                    <SelectTrigger id="stream-format" className="w-full">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mp3-128">MP3 128k</SelectItem>
                      <SelectItem value="aac-64">AAC 64k</SelectItem>
                      <SelectItem value="aac-128">AAC 128k</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="max-listeners">Max Concurrent Listeners</Label>
                  <Input
                    id="max-listeners"
                    type="number"
                    value={stream.maxListeners}
                    onChange={(e) =>
                      setStream({
                        ...stream,
                        maxListeners: parseInt(e.target.value) || 0,
                      })
                    }
                    min={1}
                  />
                </div>
              </div>

              {/* Health Check Interval */}
              <div className="grid gap-2">
                <Label htmlFor="health-check">
                  Stream Health Check Interval
                </Label>
                <Select
                  value={stream.healthCheckInterval}
                  onValueChange={(v) =>
                    setStream({ ...stream, healthCheckInterval: v })
                  }
                >
                  <SelectTrigger id="health-check" className="w-full">
                    <SelectValue placeholder="Select interval" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 seconds</SelectItem>
                    <SelectItem value="60">1 minute</SelectItem>
                    <SelectItem value="300">5 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Enable Recording */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="enable-recording">
                    Enable Stream Recording
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically record live broadcasts for on-demand playback.
                  </p>
                </div>
                <Switch
                  id="enable-recording"
                  checked={stream.enableRecording}
                  onCheckedChange={(checked) =>
                    setStream({ ...stream, enableRecording: !!checked })
                  }
                />
              </div>

              {/* Save */}
              <div className="flex justify-end">
                <Button onClick={() => handleSave("Stream settings")}>
                  <Save className="size-4" />
                  Save Stream Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================ */}
        {/*  TAB 3 — Notifications & Email                                   */}
        {/* ================================================================ */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="size-5" />
                Notifications & Email
              </CardTitle>
              <CardDescription>
                Configure email delivery, push notifications, and notification
                categories.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email Provider */}
              <div className="grid gap-2">
                <Label htmlFor="email-provider">Email Provider</Label>
                <Select
                  value={notifications.emailProvider}
                  onValueChange={(v) =>
                    setNotifications({ ...notifications, emailProvider: v })
                  }
                >
                  <SelectTrigger id="email-provider" className="w-full">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="smtp">SMTP</SelectItem>
                    <SelectItem value="sendgrid">SendGrid</SelectItem>
                    <SelectItem value="mailgun">Mailgun</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* From Email & Name */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="from-email">From Email</Label>
                  <Input
                    id="from-email"
                    type="email"
                    value={notifications.fromEmail}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        fromEmail: e.target.value,
                      })
                    }
                    placeholder="noreply@wccg.fm"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="from-name">From Name</Label>
                  <Input
                    id="from-name"
                    value={notifications.fromName}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        fromName: e.target.value,
                      })
                    }
                    placeholder="WCCG 104.5 FM"
                  />
                </div>
              </div>

              {/* SMTP Host / API Key */}
              <div className="grid gap-2">
                <Label htmlFor="smtp-api-key">
                  {notifications.emailProvider === "smtp"
                    ? "SMTP Host"
                    : "API Key"}
                </Label>
                <Input
                  id="smtp-api-key"
                  type="password"
                  value={notifications.smtpHostOrApiKey}
                  onChange={(e) =>
                    setNotifications({
                      ...notifications,
                      smtpHostOrApiKey: e.target.value,
                    })
                  }
                  placeholder={
                    notifications.emailProvider === "smtp"
                      ? "smtp.example.com"
                      : "SG.xxxxxxxxxxxx"
                  }
                />
              </div>

              {/* Global Toggles */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Delivery Channels</h3>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="enable-email">
                      Enable Email Notifications
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Send transactional and marketing emails to users.
                    </p>
                  </div>
                  <Switch
                    id="enable-email"
                    checked={notifications.enableEmailNotifications}
                    onCheckedChange={(checked) =>
                      setNotifications({
                        ...notifications,
                        enableEmailNotifications: !!checked,
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="enable-push">
                      Enable Push Notifications
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Send browser push notifications for real-time alerts.
                    </p>
                  </div>
                  <Switch
                    id="enable-push"
                    checked={notifications.enablePushNotifications}
                    onCheckedChange={(checked) =>
                      setNotifications({
                        ...notifications,
                        enablePushNotifications: !!checked,
                      })
                    }
                  />
                </div>
              </div>

              {/* Notification Categories */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">
                  Notification Categories
                </h3>
                <div className="space-y-3">
                  {(
                    [
                      {
                        key: "newUserSignup" as const,
                        label: "New User Signup",
                        desc: "Notify admins when a new user registers.",
                      },
                      {
                        key: "eventRegistration" as const,
                        label: "Event Registration",
                        desc: "Notify when a user registers for an event.",
                      },
                      {
                        key: "contentReport" as const,
                        label: "Content Report",
                        desc: "Notify moderators when content is flagged.",
                      },
                      {
                        key: "systemAlerts" as const,
                        label: "System Alerts",
                        desc: "Critical system alerts such as downtime or errors.",
                      },
                    ] as const
                  ).map((cat) => (
                    <div
                      key={cat.key}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="space-y-0.5">
                        <span className="text-sm font-medium">{cat.label}</span>
                        <p className="text-xs text-muted-foreground">
                          {cat.desc}
                        </p>
                      </div>
                      <Switch
                        checked={notifications.categories[cat.key]}
                        onCheckedChange={(checked) =>
                          setNotifications({
                            ...notifications,
                            categories: {
                              ...notifications.categories,
                              [cat.key]: !!checked,
                            },
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Save */}
              <div className="flex justify-end">
                <Button
                  onClick={() => handleSave("Notification settings")}
                >
                  <Save className="size-4" />
                  Save Notification Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================ */}
        {/*  TAB 4 — Feature Flags                                           */}
        {/* ================================================================ */}
        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ToggleLeft className="size-5" />
                Feature Flags
              </CardTitle>
              <CardDescription>
                Enable or disable platform features. Changes take effect after
                saving.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {featureFlags.map((flag) => (
                <div
                  key={flag.key}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="space-y-0.5 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{flag.label}</span>
                      <Badge
                        variant={flag.enabled ? "default" : "secondary"}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {flag.enabled ? "ON" : "OFF"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {flag.description}
                    </p>
                  </div>
                  <Switch
                    checked={flag.enabled}
                    onCheckedChange={() => toggleFeatureFlag(flag.key)}
                  />
                </div>
              ))}

              {/* Save */}
              <div className="flex justify-end pt-2">
                <Button onClick={() => handleSave("Feature flags")}>
                  <Save className="size-4" />
                  Save Feature Flags
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================ */}
        {/*  TAB 5 — API & Integrations                                      */}
        {/* ================================================================ */}
        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plug className="size-5" />
                API & Integrations
              </CardTitle>
              <CardDescription>
                Manage API configuration and third-party service integrations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* API Base URL (read-only) */}
              <div className="grid gap-2">
                <Label htmlFor="api-base-url">API Base URL</Label>
                <Input
                  id="api-base-url"
                  value={integrations.apiBaseUrl}
                  readOnly
                  className="bg-muted cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  Read-only. Configured via environment variables.
                </p>
              </div>

              {/* Rate Limit */}
              <div className="grid gap-2">
                <Label htmlFor="rate-limit">
                  Rate Limit (requests/minute)
                </Label>
                <Input
                  id="rate-limit"
                  type="number"
                  value={integrations.rateLimit}
                  onChange={(e) =>
                    setIntegrations({
                      ...integrations,
                      rateLimit: parseInt(e.target.value) || 0,
                    })
                  }
                  min={1}
                  max={10000}
                />
              </div>

              {/* Supabase URL (read-only) */}
              <div className="grid gap-2">
                <Label htmlFor="supabase-url">Supabase Project URL</Label>
                <Input
                  id="supabase-url"
                  value={integrations.supabaseUrl}
                  readOnly
                  className="bg-muted cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  Read-only. Configured via environment variables.
                </p>
              </div>

              {/* Icecast */}
              <div className="grid gap-2">
                <Label htmlFor="icecast-url">Icecast Server URL</Label>
                <Input
                  id="icecast-url"
                  value={integrations.icecastUrl}
                  onChange={(e) =>
                    setIntegrations({
                      ...integrations,
                      icecastUrl: e.target.value,
                    })
                  }
                  placeholder="https://icecast.wccg.fm:8443"
                />
              </div>

              {/* YouTube API Key */}
              <div className="grid gap-2">
                <Label htmlFor="youtube-api-key">YouTube API Key</Label>
                <Input
                  id="youtube-api-key"
                  type="password"
                  value={integrations.youtubeApiKey}
                  onChange={(e) =>
                    setIntegrations({
                      ...integrations,
                      youtubeApiKey: e.target.value,
                    })
                  }
                  placeholder="AIza..."
                />
              </div>

              {/* Facebook App ID */}
              <div className="grid gap-2">
                <Label htmlFor="facebook-app-id">Facebook App ID</Label>
                <Input
                  id="facebook-app-id"
                  type="password"
                  value={integrations.facebookAppId}
                  onChange={(e) =>
                    setIntegrations({
                      ...integrations,
                      facebookAppId: e.target.value,
                    })
                  }
                  placeholder="123456789012345"
                />
              </div>

              {/* Google Analytics ID */}
              <div className="grid gap-2">
                <Label htmlFor="ga-id">Google Analytics ID</Label>
                <Input
                  id="ga-id"
                  value={integrations.googleAnalyticsId}
                  onChange={(e) =>
                    setIntegrations({
                      ...integrations,
                      googleAnalyticsId: e.target.value,
                    })
                  }
                  placeholder="G-XXXXXXXXXX"
                />
              </div>

              {/* Save */}
              <div className="flex justify-end">
                <Button
                  onClick={() => handleSave("Integration settings")}
                >
                  <Save className="size-4" />
                  Save Integration Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================ */}
        {/*  TAB 6 — Maintenance                                             */}
        {/* ================================================================ */}
        <TabsContent value="maintenance">
          <div className="space-y-6">
            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="size-5" />
                  System Status
                </CardTitle>
                <CardDescription>
                  Current platform health and maintenance mode controls.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Status Badge */}
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">Current Status:</span>
                  {maintenance.systemStatus === "operational" ? (
                    <Badge className="bg-emerald-600 text-white">
                      <ShieldCheck className="mr-1 size-3" />
                      Operational
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <AlertTriangle className="mr-1 size-3" />
                      Maintenance
                    </Badge>
                  )}
                </div>

                {/* Maintenance Mode Toggle */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="maintenance-mode">
                      Enable Maintenance Mode
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Show a maintenance page to all visitors. Admin access
                      remains available.
                    </p>
                  </div>
                  <Switch
                    id="maintenance-mode"
                    checked={maintenance.enableMaintenanceMode}
                    onCheckedChange={(checked) =>
                      setMaintenance({
                        ...maintenance,
                        enableMaintenanceMode: !!checked,
                        systemStatus: checked ? "maintenance" : "operational",
                      })
                    }
                  />
                </div>

                {/* Maintenance Message */}
                <div className="grid gap-2">
                  <Label htmlFor="maintenance-message">
                    Maintenance Message
                  </Label>
                  <Textarea
                    id="maintenance-message"
                    value={maintenance.maintenanceMessage}
                    onChange={(e) =>
                      setMaintenance({
                        ...maintenance,
                        maintenanceMessage: e.target.value,
                      })
                    }
                    rows={3}
                    placeholder="We are currently performing scheduled maintenance..."
                  />
                </div>

                {/* Scheduled Maintenance */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Clock className="size-4" />
                    Scheduled Maintenance
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="scheduled-date">Date</Label>
                      <Input
                        id="scheduled-date"
                        type="date"
                        value={maintenance.scheduledDate}
                        onChange={(e) =>
                          setMaintenance({
                            ...maintenance,
                            scheduledDate: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="scheduled-time">Time</Label>
                      <Input
                        id="scheduled-time"
                        type="time"
                        value={maintenance.scheduledTime}
                        onChange={(e) =>
                          setMaintenance({
                            ...maintenance,
                            scheduledTime: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="size-5" />
                  Maintenance Actions
                </CardTitle>
                <CardDescription>
                  Run maintenance tasks and export data. Actions are queued and
                  processed in the background.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Button
                    variant="outline"
                    className="h-auto flex-col gap-2 py-4"
                    onClick={() => handleAction("Clear cache")}
                  >
                    <Trash2 className="size-5" />
                    <span className="text-sm font-medium">Clear Cache</span>
                    <span className="text-xs text-muted-foreground">
                      Purge all cached data
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto flex-col gap-2 py-4"
                    onClick={() => handleAction("Rebuild search index")}
                  >
                    <RefreshCw className="size-5" />
                    <span className="text-sm font-medium">
                      Rebuild Search Index
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Re-index all content
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto flex-col gap-2 py-4"
                    onClick={() => handleAction("Export database")}
                  >
                    <Download className="size-5" />
                    <span className="text-sm font-medium">Export Database</span>
                    <span className="text-xs text-muted-foreground">
                      Download full DB backup
                    </span>
                  </Button>
                </div>

                {/* Last Backup */}
                <div className="rounded-lg border bg-muted/50 p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="size-4 text-muted-foreground" />
                    <span className="font-medium">Last Backup:</span>
                    <span className="text-muted-foreground">
                      Feb 24, 2026 at 3:45 AM
                    </span>
                  </div>
                </div>

                {/* Save Maintenance Settings */}
                <div className="flex justify-end">
                  <Button
                    onClick={() => handleSave("Maintenance settings")}
                  >
                    <Save className="size-4" />
                    Save Maintenance Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
