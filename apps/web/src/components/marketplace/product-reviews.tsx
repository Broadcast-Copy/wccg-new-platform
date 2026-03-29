"use client";

import { useState, useEffect, useCallback } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Send, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Review {
  id: string;
  user_id: string;
  product_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles: { display_name: string | null } | null;
}

interface ProductReviewsProps {
  productId: string;
}

// ---------------------------------------------------------------------------
// Star Rating (display)
// ---------------------------------------------------------------------------

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={
            i <= rating
              ? "fill-amber-400 text-amber-400"
              : "text-zinc-600"
          }
        />
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Star Rating Input (interactive)
// ---------------------------------------------------------------------------

function StarRatingInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <span className="inline-flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          className="transition-transform hover:scale-110"
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(i)}
        >
          <Star
            size={28}
            className={
              i <= (hovered || value)
                ? "fill-amber-400 text-amber-400"
                : "text-zinc-500 hover:text-amber-300"
            }
          />
        </button>
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Product Reviews Component
// ---------------------------------------------------------------------------

export function ProductReviews({ productId }: ProductReviewsProps) {
  const { supabase } = useSupabase();
  const { user } = useAuth();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  // ---- Fetch reviews ----
  const fetchReviews = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("product_reviews")
      .select("*, profiles:user_id(display_name)")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load reviews:", error.message);
    } else {
      setReviews((data as Review[]) ?? []);
    }
    setLoading(false);
  }, [supabase, productId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // ---- Submit review ----
  const handleSubmit = async () => {
    if (!user) {
      toast.error("Sign in to leave a review.");
      return;
    }
    if (rating === 0) {
      toast.error("Please select a star rating.");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("product_reviews").insert({
      product_id: productId,
      user_id: user.id,
      rating,
      comment: comment.trim() || null,
    });

    if (error) {
      toast.error("Could not submit review. " + error.message);
      setSubmitting(false);
      return;
    }

    // Update vendor_products aggregate
    const { data: aggData } = await supabase
      .from("product_reviews")
      .select("rating")
      .eq("product_id", productId);

    if (aggData && aggData.length > 0) {
      const avg =
        aggData.reduce((sum, r) => sum + r.rating, 0) / aggData.length;
      await supabase
        .from("vendor_products")
        .update({
          avg_rating: Math.round(avg * 10) / 10,
          review_count: aggData.length,
        })
        .eq("id", productId);
    }

    toast.success("Review submitted!");
    setRating(0);
    setComment("");
    setSubmitting(false);
    fetchReviews();
  };

  // ---- Helpers ----
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  // ---- Render ----
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare size={20} className="text-amber-500" />
        <h3 className="text-lg font-semibold text-white">
          Reviews{" "}
          <span className="text-zinc-400 font-normal text-sm">
            ({reviews.length})
          </span>
        </h3>
      </div>

      {/* Submit form (auth-gated) */}
      {user ? (
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm text-zinc-300 font-medium">Leave a review</p>

            <StarRatingInput value={rating} onChange={setRating} />

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience (optional)..."
              rows={3}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none resize-none"
            />

            <Button
              onClick={handleSubmit}
              disabled={submitting || rating === 0}
              className="bg-amber-600 hover:bg-amber-500 text-white"
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin mr-2" />
              ) : (
                <Send size={16} className="mr-2" />
              )}
              Submit Review
            </Button>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-zinc-500 italic">
          Sign in to leave a review.
        </p>
      )}

      {/* Reviews list */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-zinc-500" />
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-center text-zinc-500 py-6">
          No reviews yet. Be the first!
        </p>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <Card
              key={review.id}
              className="border-zinc-800 bg-zinc-900/40"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <StarRating rating={review.rating} size={14} />
                    <span className="text-sm font-medium text-white">
                      {review.profiles?.display_name ?? "Anonymous"}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500">
                    {formatDate(review.created_at)}
                  </span>
                </div>
                {review.comment && (
                  <p className="text-sm text-zinc-300 mt-1">
                    {review.comment}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
