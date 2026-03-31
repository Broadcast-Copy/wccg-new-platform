"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useSupabase } from "@/components/providers/supabase-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Rss,
  Copy,
  CheckCircle2,
  Plus,
  Trash2,
  Code2,
  BookOpen,
  ExternalLink,
  Music,
  Globe,
  User,
  Mail,
  Image as ImageIcon,
  FileText,
  ChevronDown,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PodcastMeta {
  name: string;
  description: string;
  author: string;
  email: string;
  category: string;
  language: string;
  imageUrl: string;
}

interface Episode {
  id: string;
  title: string;
  description: string;
  audioUrl: string;
  pubDate: string;
  duration: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES = [
  "Arts",
  "Business",
  "Comedy",
  "Education",
  "Fiction",
  "Government",
  "Health & Fitness",
  "History",
  "Kids & Family",
  "Leisure",
  "Music",
  "News",
  "Religion & Spirituality",
  "Science",
  "Society & Culture",
  "Sports",
  "Technology",
  "True Crime",
  "TV & Film",
];

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "pt", label: "Portuguese" },
  { code: "de", label: "German" },
  { code: "ja", label: "Japanese" },
  { code: "zh", label: "Chinese" },
  { code: "ko", label: "Korean" },
];

// ---------------------------------------------------------------------------
// RSS XML generator
// ---------------------------------------------------------------------------

function generateRssXml(meta: PodcastMeta, episodes: Episode[]): string {
  const escapeXml = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  const itemsXml = episodes
    .map(
      (ep) => `    <item>
      <title>${escapeXml(ep.title)}</title>
      <description><![CDATA[${ep.description}]]></description>
      <enclosure url="${escapeXml(ep.audioUrl)}" type="audio/mpeg" length="0"/>
      <pubDate>${new Date(ep.pubDate).toUTCString()}</pubDate>
      <itunes:duration>${escapeXml(ep.duration)}</itunes:duration>
      <guid isPermaLink="false">${ep.id}</guid>
    </item>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
  xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(meta.name)}</title>
    <description><![CDATA[${meta.description}]]></description>
    <language>${escapeXml(meta.language)}</language>
    <itunes:author>${escapeXml(meta.author)}</itunes:author>
    <itunes:owner>
      <itunes:name>${escapeXml(meta.author)}</itunes:name>
      <itunes:email>${escapeXml(meta.email)}</itunes:email>
    </itunes:owner>
    <itunes:image href="${escapeXml(meta.imageUrl)}"/>
    <itunes:category text="${escapeXml(meta.category)}"/>
    <link>${typeof window !== "undefined" ? window.location.origin : ""}</link>
${itemsXml}
  </channel>
</rss>`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PodcastRssPage() {
  const { user, isLoading } = useAuth();

  // Podcast metadata
  const [meta, setMeta] = useState<PodcastMeta>({
    name: "",
    description: "",
    author: "",
    email: "",
    category: "Music",
    language: "en",
    imageUrl: "",
  });

  // Episodes
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [showAddEpisode, setShowAddEpisode] = useState(false);
  const [newEpisode, setNewEpisode] = useState<Omit<Episode, "id">>({
    title: "",
    description: "",
    audioUrl: "",
    pubDate: new Date().toISOString().slice(0, 10),
    duration: "00:00:00",
  });

  // UI state
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  const rssXml = useMemo(() => generateRssXml(meta, episodes), [meta, episodes]);

  const feedUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const slug = meta.name
      ? meta.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
      : "my-podcast";
    return `${window.location.origin}/api/v1/podcasts/${slug}/feed.xml`;
  }, [meta.name]);

  const handleCopyFeedUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const input = document.createElement("input");
      input.value = feedUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [feedUrl]);

  const handleCopyXml = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(rssXml);
    } catch {
      // ignore
    }
  }, [rssXml]);

  const addEpisode = useCallback(() => {
    if (!newEpisode.title.trim() || !newEpisode.audioUrl.trim()) return;
    setEpisodes((prev) => [
      { ...newEpisode, id: `ep-${Date.now()}` },
      ...prev,
    ]);
    setNewEpisode({
      title: "",
      description: "",
      audioUrl: "",
      pubDate: new Date().toISOString().slice(0, 10),
      duration: "00:00:00",
    });
    setShowAddEpisode(false);
  }, [newEpisode]);

  const removeEpisode = useCallback((id: string) => {
    setEpisodes((prev) => prev.filter((ep) => ep.id !== id));
  }, []);

  const isFormValid = meta.name.trim() && meta.description.trim() && meta.author.trim();

  // ---------------------------------------------------------------------------
  // Auth guard
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#7401df] border-t-transparent" />
      </div>
    );
  }

  if (!user?.email) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Card className="border-white/10 bg-white/5">
          <CardContent className="py-12 text-center">
            <p className="text-white/60">Sign in to use the Podcast RSS Generator</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Back link */}
      <Link
        href="/my"
        className="mb-6 inline-flex items-center text-sm text-white/50 hover:text-white/70 transition-colors"
      >
        &larr; Back to My Dashboard
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Rss className="h-8 w-8 text-[#7401df]" />
          Podcast RSS Generator
        </h1>
        <p className="mt-2 text-white/60">
          Generate an RSS feed URL for your podcast and submit to major platforms
        </p>
      </div>

      {/* Podcast Metadata Form */}
      <Card className="mb-6 border-[#7401df]/20 bg-gradient-to-br from-[#7401df]/10 via-white/5 to-[#7401df]/5">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#7401df]" />
            Podcast Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-white/70 flex items-center gap-1">
              <Music className="h-3.5 w-3.5" /> Podcast Name *
            </label>
            <Input
              value={meta.name}
              onChange={(e) => setMeta((m) => ({ ...m, name: e.target.value }))}
              placeholder="e.g. The WCCG Morning Show"
              className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-white/70">Description *</label>
            <textarea
              value={meta.description}
              onChange={(e) => setMeta((m) => ({ ...m, description: e.target.value }))}
              placeholder="What is your podcast about?"
              rows={3}
              className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#7401df]/50 focus:outline-none focus:ring-1 focus:ring-[#7401df]/50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-white/70 flex items-center gap-1">
                <User className="h-3.5 w-3.5" /> Author *
              </label>
              <Input
                value={meta.author}
                onChange={(e) => setMeta((m) => ({ ...m, author: e.target.value }))}
                placeholder="Your name"
                className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-white/70 flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" /> Email
              </label>
              <Input
                value={meta.email}
                onChange={(e) => setMeta((m) => ({ ...m, email: e.target.value }))}
                placeholder="podcast@example.com"
                className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-white/70">Category</label>
              <div className="relative">
                <select
                  value={meta.category}
                  onChange={(e) => setMeta((m) => ({ ...m, category: e.target.value }))}
                  className="w-full appearance-none rounded-md border border-white/10 bg-white/5 px-3 py-2 pr-8 text-sm text-white focus:border-[#7401df]/50 focus:outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-[#0a0a0f]">
                      {c}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-white/70 flex items-center gap-1">
                <Globe className="h-3.5 w-3.5" /> Language
              </label>
              <div className="relative">
                <select
                  value={meta.language}
                  onChange={(e) => setMeta((m) => ({ ...m, language: e.target.value }))}
                  className="w-full appearance-none rounded-md border border-white/10 bg-white/5 px-3 py-2 pr-8 text-sm text-white focus:border-[#7401df]/50 focus:outline-none"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code} className="bg-[#0a0a0f]">
                      {l.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-white/70 flex items-center gap-1">
              <ImageIcon className="h-3.5 w-3.5" /> Cover Image URL
            </label>
            <Input
              value={meta.imageUrl}
              onChange={(e) => setMeta((m) => ({ ...m, imageUrl: e.target.value }))}
              placeholder="https://example.com/cover.jpg (min 1400x1400px)"
              className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
            />
          </div>
        </CardContent>
      </Card>

      {/* Episodes */}
      <Card className="mb-6 border-white/10 bg-white/5">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Music className="h-5 w-5 text-[#7401df]" />
            Episodes
            {episodes.length > 0 && (
              <Badge variant="secondary" className="bg-[#7401df]/20 text-[#7401df] text-xs">
                {episodes.length}
              </Badge>
            )}
          </CardTitle>
          <Button
            onClick={() => setShowAddEpisode(!showAddEpisode)}
            variant="outline"
            size="sm"
            className="border-[#7401df]/30 text-[#7401df] hover:bg-[#7401df]/10"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Episode
          </Button>
        </CardHeader>
        <CardContent>
          {/* Add episode form */}
          {showAddEpisode && (
            <div className="mb-4 rounded-lg border border-[#7401df]/20 bg-[#7401df]/5 p-4 space-y-3">
              <Input
                value={newEpisode.title}
                onChange={(e) => setNewEpisode((ep) => ({ ...ep, title: e.target.value }))}
                placeholder="Episode title *"
                className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
              />
              <textarea
                value={newEpisode.description}
                onChange={(e) => setNewEpisode((ep) => ({ ...ep, description: e.target.value }))}
                placeholder="Episode description..."
                rows={2}
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#7401df]/50 focus:outline-none focus:ring-1 focus:ring-[#7401df]/50"
              />
              <Input
                value={newEpisode.audioUrl}
                onChange={(e) => setNewEpisode((ep) => ({ ...ep, audioUrl: e.target.value }))}
                placeholder="Audio file URL * (e.g. https://cdn.example.com/ep1.mp3)"
                className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-white/50">Publish Date</label>
                  <Input
                    type="date"
                    value={newEpisode.pubDate}
                    onChange={(e) => setNewEpisode((ep) => ({ ...ep, pubDate: e.target.value }))}
                    className="border-white/10 bg-white/5 text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-white/50">Duration (HH:MM:SS)</label>
                  <Input
                    value={newEpisode.duration}
                    onChange={(e) => setNewEpisode((ep) => ({ ...ep, duration: e.target.value }))}
                    placeholder="01:23:45"
                    className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={addEpisode}
                  disabled={!newEpisode.title.trim() || !newEpisode.audioUrl.trim()}
                  className="bg-[#7401df] hover:bg-[#7401df]/80 text-white"
                >
                  Add Episode
                </Button>
                <Button
                  onClick={() => setShowAddEpisode(false)}
                  variant="outline"
                  className="border-white/10 text-white/60 hover:bg-white/10"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Episode list */}
          {episodes.length === 0 ? (
            <p className="text-sm text-white/40 text-center py-6">
              No episodes added yet. Click &quot;Add Episode&quot; to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {episodes.map((ep, i) => (
                <div
                  key={ep.id}
                  className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7401df]/20 text-xs font-bold text-[#7401df] shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-white truncate">{ep.title}</h4>
                    <p className="text-xs text-white/40">
                      {new Date(ep.pubDate).toLocaleDateString()} &middot; {ep.duration}
                    </p>
                  </div>
                  <button
                    onClick={() => removeEpisode(ep.id)}
                    className="text-white/30 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feed URL & Actions */}
      <Card className="mb-6 border-[#7401df]/20 bg-gradient-to-br from-[#7401df]/10 via-white/5 to-[#7401df]/5">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Rss className="h-5 w-5 text-[#7401df]" />
            Your RSS Feed
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-white/10 bg-black/30 p-3">
            <p className="text-xs text-white/40 mb-1">Feed URL</p>
            <p className="text-sm text-[#7401df] font-mono break-all">{feedUrl}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleCopyFeedUrl}
              disabled={!isFormValid}
              variant="outline"
              className="border-[#7401df]/30 text-[#7401df] hover:bg-[#7401df]/10"
            >
              {copied ? (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Copied!
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Copy className="h-4 w-4" /> Copy Feed URL
                </span>
              )}
            </Button>
            <Button
              onClick={() => setShowPreview(!showPreview)}
              disabled={!isFormValid}
              variant="outline"
              className="border-white/10 text-white/60 hover:bg-white/10"
            >
              <Code2 className="h-4 w-4 mr-1" />
              {showPreview ? "Hide" : "Preview"} XML
            </Button>
          </div>

          {/* XML Preview */}
          {showPreview && (
            <div className="relative">
              <pre className="max-h-80 overflow-auto rounded-lg border border-white/10 bg-black/50 p-4 text-xs text-green-400 font-mono whitespace-pre-wrap">
                {rssXml}
              </pre>
              <Button
                onClick={handleCopyXml}
                size="sm"
                variant="outline"
                className="absolute top-2 right-2 border-white/10 text-white/40 hover:bg-white/10 text-xs"
              >
                <Copy className="h-3 w-3 mr-1" /> Copy XML
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit Instructions */}
      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-white/60" />
            Submit to Platforms
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-6 rounded bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white">
                  A
                </div>
                <h4 className="font-semibold text-white text-sm">Apple Podcasts</h4>
              </div>
              <ol className="list-decimal list-inside text-xs text-white/50 space-y-1">
                <li>Go to Podcasts Connect (podcastsconnect.apple.com)</li>
                <li>Sign in with your Apple ID</li>
                <li>Click the + button and paste your RSS feed URL</li>
                <li>Validate and submit for review (takes 1-5 days)</li>
              </ol>
              <a
                href="https://podcastsconnect.apple.com"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-[#7401df] hover:underline"
              >
                Open Podcasts Connect <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-6 rounded bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-xs font-bold text-white">
                  S
                </div>
                <h4 className="font-semibold text-white text-sm">Spotify</h4>
              </div>
              <ol className="list-decimal list-inside text-xs text-white/50 space-y-1">
                <li>Go to Spotify for Podcasters (podcasters.spotify.com)</li>
                <li>Sign in or create a Spotify account</li>
                <li>Click &quot;Get Started&quot; and paste your RSS feed URL</li>
                <li>Verify ownership via email and submit</li>
              </ol>
              <a
                href="https://podcasters.spotify.com"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-[#7401df] hover:underline"
              >
                Open Spotify for Podcasters <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-6 rounded bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-xs font-bold text-white">
                  G
                </div>
                <h4 className="font-semibold text-white text-sm">Google Podcasts</h4>
              </div>
              <ol className="list-decimal list-inside text-xs text-white/50 space-y-1">
                <li>Go to Google Podcasts Manager (podcastsmanager.google.com)</li>
                <li>Sign in with your Google account</li>
                <li>Click &quot;Start Now&quot; and paste your RSS feed URL</li>
                <li>Verify ownership and your podcast will appear in Google search</li>
              </ol>
              <a
                href="https://podcastsmanager.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-[#7401df] hover:underline"
              >
                Open Google Podcasts Manager <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
