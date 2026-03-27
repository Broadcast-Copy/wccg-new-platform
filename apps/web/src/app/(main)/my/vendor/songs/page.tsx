"use client";

import { useState } from "react";
import {
  Music,
  Upload,
  Play,
  Clock,
  Radio,
  X,
  ChevronDown,
  BarChart3,
  FileAudio,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Archive,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SongStatus = "In Rotation" | "Pending Review" | "Archived";
type Genre = "Hip-Hop" | "R&B" | "Gospel" | "Pop" | "Other";

interface Song {
  id: string;
  title: string;
  artist: string;
  genre: Genre;
  uploadDate: string;
  totalPlays: number;
  status: SongStatus;
}

interface SpinEntry {
  songTitle: string;
  timestamp: string;
  show: string;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const GENRES: Genre[] = ["Hip-Hop", "R&B", "Gospel", "Pop", "Other"];

const SEED_SONGS: Song[] = [
  {
    id: "s1",
    title: "Crown City Anthem",
    artist: "DJ Fayetteville",
    genre: "Hip-Hop",
    uploadDate: "2026-02-15",
    totalPlays: 1247,
    status: "In Rotation",
  },
  {
    id: "s2",
    title: "Summer in the Ville",
    artist: "Lena Skye",
    genre: "R&B",
    uploadDate: "2026-03-01",
    totalPlays: 834,
    status: "In Rotation",
  },
  {
    id: "s3",
    title: "Blessings on Blessings",
    artist: "Pastor T & The Choir",
    genre: "Gospel",
    uploadDate: "2026-03-10",
    totalPlays: 562,
    status: "In Rotation",
  },
  {
    id: "s4",
    title: "Midnight Ride",
    artist: "Korey Banks",
    genre: "Hip-Hop",
    uploadDate: "2026-03-18",
    totalPlays: 128,
    status: "Pending Review",
  },
  {
    id: "s5",
    title: "Feel the Vibe",
    artist: "Amara Cole",
    genre: "Pop",
    uploadDate: "2026-03-20",
    totalPlays: 45,
    status: "Pending Review",
  },
  {
    id: "s6",
    title: "Old School Groove",
    artist: "DJ Fayetteville",
    genre: "R&B",
    uploadDate: "2025-12-05",
    totalPlays: 2310,
    status: "Archived",
  },
];

const SPIN_HISTORY: SpinEntry[] = [
  { songTitle: "Crown City Anthem", timestamp: "2026-03-27 08:14 AM", show: "Morning Mix" },
  { songTitle: "Summer in the Ville", timestamp: "2026-03-27 07:42 AM", show: "Morning Mix" },
  { songTitle: "Blessings on Blessings", timestamp: "2026-03-27 06:55 AM", show: "Sunrise Gospel" },
  { songTitle: "Crown City Anthem", timestamp: "2026-03-26 09:30 PM", show: "Night Vibes" },
  { songTitle: "Summer in the Ville", timestamp: "2026-03-26 08:15 PM", show: "Night Vibes" },
  { songTitle: "Blessings on Blessings", timestamp: "2026-03-26 06:00 PM", show: "Drive Time" },
  { songTitle: "Crown City Anthem", timestamp: "2026-03-26 02:10 PM", show: "Afternoon Heat" },
  { songTitle: "Summer in the Ville", timestamp: "2026-03-26 12:45 PM", show: "Lunch Break Beats" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const statusConfig: Record<SongStatus, { bg: string; text: string; icon: typeof Play }> = {
  "In Rotation": {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-400",
    icon: CheckCircle2,
  },
  "Pending Review": {
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    text: "text-yellow-700 dark:text-yellow-400",
    icon: AlertCircle,
  },
  Archived: {
    bg: "bg-gray-100 dark:bg-gray-800/50",
    text: "text-gray-600 dark:text-gray-400",
    icon: Archive,
  },
};

const genreColors: Record<Genre, string> = {
  "Hip-Hop": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  "R&B": "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  Gospel: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Pop: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  Other: "bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VendorSongsPage() {
  const [songs, setSongs] = useState(SEED_SONGS);
  const [showUploadForm, setShowUploadForm] = useState(false);

  // Upload form state
  const [formTitle, setFormTitle] = useState("");
  const [formArtist, setFormArtist] = useState("");
  const [formGenre, setFormGenre] = useState<Genre>("Hip-Hop");
  const [formNotes, setFormNotes] = useState("");

  // Stats
  const totalUploads = songs.length;
  const inRotation = songs.filter((s) => s.status === "In Rotation").length;
  const totalPlays = songs.reduce((sum, s) => sum + s.totalPlays, 0);

  const handleUpload = () => {
    if (!formTitle.trim() || !formArtist.trim()) return;
    const newSong: Song = {
      id: `s${Date.now()}`,
      title: formTitle,
      artist: formArtist,
      genre: formGenre,
      uploadDate: new Date().toISOString().slice(0, 10),
      totalPlays: 0,
      status: "Pending Review",
    };
    setSongs((prev) => [newSong, ...prev]);
    setFormTitle("");
    setFormArtist("");
    setFormGenre("Hip-Hop");
    setFormNotes("");
    setShowUploadForm(false);
  };

  const handleRequestRotation = (id: string) => {
    setSongs((prev) =>
      prev.map((s) => (s.id === id && s.status !== "In Rotation" ? { ...s, status: "Pending Review" as SongStatus } : s))
    );
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Song Tracking</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage uploads and track radio spins
          </p>
        </div>
        <button
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
        >
          {showUploadForm ? <X className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
          {showUploadForm ? "Cancel" : "Upload Song"}
        </button>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Stats Row                                                         */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Total Uploads", value: totalUploads.toString(), icon: Music, color: "text-amber-500" },
          { label: "In Rotation", value: inRotation.toString(), icon: Radio, color: "text-green-500" },
          { label: "Total Plays", value: totalPlays.toLocaleString(), icon: Play, color: "text-blue-500" },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
            <div className={`rounded-xl bg-muted p-3 ${s.color}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-xl font-bold">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Upload Form                                                       */}
      {/* ----------------------------------------------------------------- */}
      {showUploadForm && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Upload New Song</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Title</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Song title"
                className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Artist</label>
              <input
                type="text"
                value={formArtist}
                onChange={(e) => setFormArtist(e.target.value)}
                placeholder="Artist name"
                className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Genre</label>
              <div className="relative">
                <select
                  value={formGenre}
                  onChange={(e) => setFormGenre(e.target.value as Genre)}
                  className="w-full appearance-none rounded-xl border border-border bg-background px-4 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {GENRES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Audio File</label>
              <div className="flex h-[38px] items-center gap-2 rounded-xl border border-dashed border-border bg-muted/50 px-4 text-sm text-muted-foreground">
                <FileAudio className="h-4 w-4" />
                <span>Drag & drop or click to select</span>
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">Notes</label>
              <textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Additional notes or context..."
                rows={2}
                className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
          <button
            onClick={handleUpload}
            className="mt-4 rounded-xl bg-amber-500 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
          >
            Submit Song
          </button>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Song List                                                         */}
      {/* ----------------------------------------------------------------- */}
      <section>
        <h2 className="text-2xl font-bold">Your Songs</h2>
        <div className="mt-4 space-y-3">
          {songs.map((song) => {
            const sc = statusConfig[song.status];
            const StatusIcon = sc.icon;

            return (
              <div
                key={song.id}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    <Music className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{song.title}</h3>
                    <p className="text-sm text-muted-foreground">{song.artist}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${genreColors[song.genre]}`}>
                    {song.genre}
                  </span>
                  <span className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${sc.bg} ${sc.text}`}>
                    <StatusIcon className="h-3 w-3" />
                    {song.status}
                  </span>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Play className="h-3.5 w-3.5" />
                    {song.totalPlays.toLocaleString()} plays
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {song.uploadDate}
                  </div>
                  {song.status !== "In Rotation" && (
                    <button
                      onClick={() => handleRequestRotation(song.id)}
                      className="flex items-center gap-1 rounded-xl border border-amber-500 px-3 py-1 text-xs font-semibold text-amber-600 transition-colors hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Request Rotation
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Spin History                                                      */}
      {/* ----------------------------------------------------------------- */}
      <section>
        <h2 className="text-2xl font-bold">Recent Spins</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Song</th>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Show</th>
              </tr>
            </thead>
            <tbody>
              {SPIN_HISTORY.map((spin, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{spin.songTitle}</td>
                  <td className="px-4 py-3 text-muted-foreground">{spin.timestamp}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      {spin.show}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
