"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Upload,
  Image as ImageIcon,
  FileAudio,
  X,
  Loader2,
  CheckCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const GENRES = [
  "Hip Hop",
  "R&B",
  "Gospel",
  "Reggae",
  "Afrobeats",
  "Club",
  "Other",
];

export default function UploadMixPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("");
  const [tags, setTags] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
    }
  }

  function clearFile() {
    setAudioFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter a title for your mix.");
      return;
    }

    if (!genre) {
      toast.error("Please select a genre.");
      return;
    }

    if (!audioFile) {
      toast.error("Please select an audio file to upload.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadComplete(false);

    // Simulate upload progress animation
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 300);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      if (description.trim()) formData.append("description", description.trim());
      formData.append("genre", genre);
      if (tags.trim()) formData.append("tags", tags.trim());
      if (coverImageUrl.trim())
        formData.append("coverImageUrl", coverImageUrl.trim());
      formData.append("audio", audioFile);

      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

      // Use raw fetch for FormData (no Content-Type header — browser sets boundary)
      const headers: Record<string, string> = {};

      if (typeof window !== "undefined") {
        try {
          const { createClient } = await import("@/lib/supabase/client");
          const supabase = createClient();
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.access_token) {
            headers["Authorization"] = `Bearer ${session.access_token}`;
          }
        } catch {
          // Continue without auth
        }
      }

      const res = await fetch(`${API_URL}/mixes`, {
        method: "POST",
        headers,
        body: formData,
      });

      clearInterval(progressInterval);

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(error.message || "Upload failed");
      }

      setUploadProgress(100);
      setUploadComplete(true);
      toast.success("Mix uploaded successfully!");

      // Redirect to mixes list after a brief delay
      setTimeout(() => {
        router.push("/dashboard/mixes");
      }, 1500);
    } catch (err) {
      clearInterval(progressInterval);
      setUploadProgress(0);
      setUploading(false);
      toast.error(
        err instanceof Error ? err.message : "Failed to upload mix"
      );
      console.error(err);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Upload Mix
        </h1>
        <p className="text-muted-foreground">
          Share your latest mix with the WCCG community
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Mix Details */}
        <Card className="border-white/10 bg-[#12121a]">
          <CardHeader>
            <CardTitle className="text-white">Mix Details</CardTitle>
            <CardDescription>
              Basic information about your mix
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-white">
                Title <span className="text-red-400">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My Awesome Mix"
                required
                className="border-white/10 bg-white/5 text-white placeholder:text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-white">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell listeners what this mix is about..."
                rows={4}
                className="border-white/10 bg-white/5 text-white placeholder:text-muted-foreground"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-white">
                  Genre <span className="text-red-400">*</span>
                </Label>
                <Select value={genre} onValueChange={setGenre}>
                  <SelectTrigger className="w-full border-white/10 bg-white/5 text-white">
                    <SelectValue placeholder="Select genre" />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-[#1a1a24]">
                    {GENRES.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags" className="text-white">
                  Tags
                </Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="chill, summer, vibes"
                  className="border-white/10 bg-white/5 text-white placeholder:text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated tags
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="coverImageUrl"
                className="flex items-center gap-2 text-white"
              >
                <ImageIcon className="size-4" />
                Cover Image URL
              </Label>
              <Input
                id="coverImageUrl"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://example.com/cover.jpg"
                className="border-white/10 bg-white/5 text-white placeholder:text-muted-foreground"
              />
              {coverImageUrl && (
                <div className="mt-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverImageUrl}
                    alt="Cover preview"
                    className="h-24 w-24 rounded-lg border border-white/10 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Audio File */}
        <Card className="border-white/10 bg-[#12121a]">
          <CardHeader>
            <CardTitle className="text-white">Audio File</CardTitle>
            <CardDescription>
              Upload your mix file (MP3, WAV, or M4A)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!audioFile ? (
              <div
                className="group cursor-pointer rounded-lg border-2 border-dashed border-white/10 bg-white/5 p-8 text-center transition-colors hover:border-[#74ddc7]/30 hover:bg-[#74ddc7]/5"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileAudio className="mx-auto mb-3 size-12 text-muted-foreground group-hover:text-[#74ddc7]" />
                <p className="text-sm font-medium text-white">
                  Click to select an audio file
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Supports .mp3, .wav, .m4a
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/x-m4a,audio/mp4"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="flex items-center gap-4 rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="flex size-12 items-center justify-center rounded-lg bg-[#7401df]/20">
                  <FileAudio className="size-6 text-[#7401df]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {audioFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(audioFile.size)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-red-400"
                  onClick={clearFile}
                  disabled={uploading}
                >
                  <X className="size-4" />
                </Button>
              </div>
            )}

            {/* Upload Progress */}
            {uploading && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {uploadComplete ? "Upload complete!" : "Uploading..."}
                  </span>
                  <span className="text-[#74ddc7]">
                    {Math.round(uploadProgress)}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      uploadComplete
                        ? "bg-[#74ddc7]"
                        : "bg-gradient-to-r from-[#7401df] to-[#74ddc7]"
                    }`}
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                {uploadComplete && (
                  <div className="flex items-center gap-2 text-sm text-[#74ddc7]">
                    <CheckCircle className="size-4" />
                    <span>Redirecting to your mixes...</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            className="border-white/10"
            onClick={() => router.push("/dashboard/mixes")}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={uploading || !title.trim() || !genre || !audioFile}
            className="bg-[#74ddc7] text-black hover:bg-[#5fc4b0] disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 size-4" />
                Upload Mix
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
