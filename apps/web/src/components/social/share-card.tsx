"use client";

import { useState } from "react";
import { Share2, Check, Copy, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { shareContent } from "@/lib/share";
import { toast } from "sonner";

interface ShareCardProps {
  title: string;
  text: string;
  url: string;
  /** "icon" = small icon button, "button" = full button, "card" = card with preview */
  variant?: "icon" | "button" | "card";
  className?: string;
}

export function ShareCard({
  title,
  text,
  url,
  variant = "button",
  className = "",
}: ShareCardProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const success = await shareContent({ title, text, url });
    if (success) {
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (variant === "icon") {
    return (
      <button
        onClick={handleShare}
        className={`inline-flex items-center justify-center h-9 w-9 rounded-full bg-foreground/5 hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors ${className}`}
        aria-label="Share"
      >
        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Share2 className="h-4 w-4" />}
      </button>
    );
  }

  if (variant === "card") {
    return (
      <div className={`rounded-xl border border-border bg-card p-4 space-y-3 ${className}`}>
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          Share this
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
          <span className="flex-1 text-xs text-muted-foreground truncate">{url}</span>
          <button
            onClick={handleShare}
            className="shrink-0 text-xs font-medium text-[#14b8a6] hover:text-[#0d9488] transition-colors flex items-center gap-1"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    );
  }

  // Default: button variant
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleShare}
      className={`gap-2 ${className}`}
    >
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Share2 className="h-4 w-4" />}
      {copied ? "Copied!" : "Share"}
    </Button>
  );
}
