"use client";

import { useCallback, useRef, useState } from "react";
import {
  CloudUpload,
  FileAudio,
  Loader2,
  CheckCircle2,
  X,
  Music,
} from "lucide-react";
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
import { apiClient } from "@/lib/api-client";

interface MixUploaderProps {
  onSuccess?: () => void;
  hostId?: string;
}

const GENRES = [
  "Hip Hop",
  "R&B",
  "Gospel",
  "Reggae",
  "Afrobeats",
  "Club",
  "Soca",
  "Other",
];

const ACCEPTED_TYPES = ".mp3,.wav,.m4a";
const ACCEPTED_MIME = ["audio/mpeg", "audio/wav", "audio/x-m4a", "audio/mp4"];

export function MixUploader({ onSuccess, hostId }: MixUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("");
  const [tags, setTags] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && ACCEPTED_MIME.includes(droppedFile.type)) {
      setFile(droppedFile);
      setError(null);
    } else {
      setError("Please upload an .mp3, .wav, or .m4a file.");
    }
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        setFile(selectedFile);
        setError(null);
      }
    },
    []
  );

  const removeFile = useCallback(() => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!file) {
      setError("Please select an audio file.");
      return;
    }
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);

    // Mock progress animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 300);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        genre: genre || undefined,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        coverImageUrl: coverImageUrl.trim() || undefined,
        hostId: hostId || undefined,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      };

      await apiClient("/mixes", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      clearInterval(progressInterval);
      setProgress(100);
      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      clearInterval(progressInterval);
      setProgress(0);
      setError(
        err instanceof Error ? err.message : "Upload failed. Please try again."
      );
    } finally {
      setUploading(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-[#74ddc7]/30 bg-[#74ddc7]/5 p-10 text-center">
        <CheckCircle2 className="mb-4 h-12 w-12 text-[#74ddc7]" />
        <h3 className="text-xl font-bold text-white">Upload Successful!</h3>
        <p className="mt-2 text-sm text-gray-400">
          Your mix has been submitted and is being processed.
        </p>
        <div className="mt-6 flex gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setSuccess(false);
              setFile(null);
              setTitle("");
              setDescription("");
              setGenre("");
              setTags("");
              setCoverImageUrl("");
              setProgress(0);
            }}
            className="rounded-full border-white/20 text-white hover:bg-white/10"
          >
            Upload Another
          </Button>
          <Button
            asChild
            className="rounded-full bg-[#74ddc7] text-[#0a0a0f] hover:bg-[#74ddc7]/80"
          >
            <a href="/mixes">View Mixes</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Drag and drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
          dragOver
            ? "border-[#74ddc7] bg-[#74ddc7]/10"
            : file
              ? "border-[#74ddc7]/40 bg-[#74ddc7]/5"
              : "border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={handleFileSelect}
          className="hidden"
        />

        {file ? (
          <div className="flex items-center justify-center gap-3">
            <FileAudio className="h-8 w-8 text-[#74ddc7]" />
            <div className="text-left">
              <p className="text-sm font-medium text-white">{file.name}</p>
              <p className="text-xs text-gray-400">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeFile();
              }}
              className="ml-2 rounded-full p-1 text-gray-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <CloudUpload className="mx-auto mb-3 h-10 w-10 text-gray-400" />
            <p className="text-sm font-medium text-white">
              Drag & drop your mix here
            </p>
            <p className="mt-1 text-xs text-gray-500">
              or click to browse. Accepts .mp3, .wav, .m4a
            </p>
          </>
        )}
      </div>

      {/* Progress bar */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Uploading...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#7401df] to-[#74ddc7] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="mix-title" className="text-gray-300">
          Title <span className="text-red-400">*</span>
        </Label>
        <Input
          id="mix-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Friday Night Vibes Vol. 3"
          required
          disabled={uploading}
          className="border-white/15 bg-white/5 text-white placeholder:text-gray-500 focus:border-[#74ddc7]/50"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="mix-description" className="text-gray-300">
          Description
        </Label>
        <Textarea
          id="mix-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tell listeners what to expect from this mix..."
          rows={3}
          disabled={uploading}
          className="border-white/15 bg-white/5 text-white placeholder:text-gray-500 focus:border-[#74ddc7]/50"
        />
      </div>

      {/* Genre + Tags row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-gray-300">Genre</Label>
          <Select value={genre} onValueChange={setGenre} disabled={uploading}>
            <SelectTrigger className="w-full border-white/15 bg-white/5 text-white">
              <SelectValue placeholder="Select genre" />
            </SelectTrigger>
            <SelectContent>
              {GENRES.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mix-tags" className="text-gray-300">
            Tags
          </Label>
          <Input
            id="mix-tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="hip hop, 2024, vibes"
            disabled={uploading}
            className="border-white/15 bg-white/5 text-white placeholder:text-gray-500 focus:border-[#74ddc7]/50"
          />
          <p className="text-xs text-gray-500">Separate with commas</p>
        </div>
      </div>

      {/* Cover Image URL */}
      <div className="space-y-2">
        <Label htmlFor="mix-cover" className="text-gray-300">
          Cover Image URL
        </Label>
        <Input
          id="mix-cover"
          value={coverImageUrl}
          onChange={(e) => setCoverImageUrl(e.target.value)}
          placeholder="https://example.com/cover.jpg"
          disabled={uploading}
          className="border-white/15 bg-white/5 text-white placeholder:text-gray-500 focus:border-[#74ddc7]/50"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        disabled={uploading || !file || !title.trim()}
        className="w-full rounded-full bg-gradient-to-r from-[#7401df] to-[#74ddc7] text-white shadow-lg shadow-[#7401df]/20 hover:opacity-90 disabled:opacity-50"
      >
        {uploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Music className="mr-2 h-4 w-4" />
            Upload Mix
          </>
        )}
      </Button>
    </form>
  );
}
