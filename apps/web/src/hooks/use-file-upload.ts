"use client";

import { useState, useCallback } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useAuth } from "@/hooks/use-auth";

/**
 * Hook for uploading files to Supabase Storage.
 *
 * Buckets:
 * - "audio" — production audio files (mp3, wav, flac) — 50MB max
 * - "images" — thumbnails, product images, blog images — 5MB max
 * - "media" — commercials, podcast episodes — 100MB max
 */
export function useFileUpload(bucket: string) {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File): Promise<string | null> => {
      if (!user?.id) {
        setError("You must be logged in to upload files");
        return null;
      }

      setIsUploading(true);
      setProgress(0);
      setError(null);

      try {
        // Generate unique path: userId/timestamp_filename
        const ext = file.name.split(".").pop() || "bin";
        const safeName = file.name
          .replace(/[^a-zA-Z0-9._-]/g, "_")
          .toLowerCase();
        const path = `${user.id}/${Date.now()}_${safeName}`;

        // Upload to Supabase Storage
        const { data, error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from(bucket).getPublicUrl(data.path);

        setProgress(100);
        return publicUrl;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Upload failed";
        setError(msg);
        console.error("File upload error:", err);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [supabase, user, bucket]
  );

  const reset = useCallback(() => {
    setIsUploading(false);
    setProgress(0);
    setError(null);
  }, []);

  return { upload, isUploading, progress, error, reset };
}
