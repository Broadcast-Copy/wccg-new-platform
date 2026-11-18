"use client";

import { useState } from "react";
import Link from "next/link";
import { Radio, Music2, Heart, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITE_URL } from "@/lib/site";
import { track } from "@/lib/analytics";

const SHARE_URL = `${SITE_URL}/listen/wccg/?utm_source=listener_share&utm_medium=referral&utm_campaign=listen_wccg`;

export function ListenerInvite() {
  const [message, setMessage] = useState("");
  const [manualCopy, setManualCopy] = useState(false);
  const [sharing, setSharing] = useState(false);

  async function share() {
    setSharing(true);
    setMessage("");
    try {
      if (navigator.share) {
        try {
          await navigator.share({ title: "WCCG 104.5 FM", text: "Your city. Your music. Listen to Fayetteville’s hip hop and R&B on WCCG.", url: SHARE_URL });
          void track("station_share", { source: "home", method: "native" });
          setMessage("Thanks for sharing WCCG.");
          return;
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") return;
        }
      }
      try {
        await navigator.clipboard.writeText(SHARE_URL);
        void track("station_share", { source: "home", method: "copy" });
        setMessage("Listening link copied. Send it to someone who needs a better soundtrack.");
      } catch {
        setManualCopy(true);
        setMessage("Copy the listening link below to share WCCG.");
      }
    } finally { setSharing(false); }
  }

  return (
    <section aria-labelledby="listener-invite-title" className="rounded-2xl border border-border bg-card p-5 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-widest text-red-700 dark:text-red-400">Make 104.5 part of your day</p><h2 id="listener-invite-title" className="mt-2 text-2xl font-black text-foreground">A station that goes where you go.</h2></div>
        <Link href="/listen/wccg/" className="font-semibold text-red-700 underline underline-offset-4 dark:text-red-400">Open the WCCG player</Link>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          { href: "/shows", icon: Radio, title: "Find your daily favorite", text: "Get to know the hosts and shows behind your mornings, workdays and nights." },
          { href: "/channels", icon: Music2, title: "Find your sound", text: "Start with WCCG, then explore our hip hop, R&B and Caribbean channels." },
          { href: "/requests", icon: Heart, title: "Tell us what you love", text: "Send a song request and help shape the conversation around your music." },
        ].map(({ href, icon: Icon, title, text }) => (
          <Link key={href} href={href} className="rounded-xl border border-border p-4 transition-colors hover:border-red-500/50 hover:bg-red-500/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600">
            <Icon className="mb-3 h-5 w-5 text-red-600 dark:text-red-400" aria-hidden="true" /><h3 className="font-bold text-foreground">{title}</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
          </Link>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-muted/60 p-4">
        <div><h3 className="font-bold text-foreground">Good music travels. Bring a friend.</h3><p className="mt-1 text-sm text-muted-foreground">Share a direct link to WCCG. They can listen in their browser.</p></div>
        <Button type="button" variant="outline" onClick={share} disabled={sharing} className="rounded-full"><Share2 className="mr-2 h-4 w-4" aria-hidden="true" />{sharing ? "Opening…" : "Share WCCG"}</Button>
      </div>
      <p role="status" aria-live="polite" className="mt-2 text-sm text-muted-foreground">{message}</p>
      {manualCopy && <input readOnly aria-label="WCCG listening link to copy" value={SHARE_URL} onFocus={e => e.currentTarget.select()} className="mt-2 w-full rounded-lg border border-border bg-background p-3 text-sm" />}
    </section>
  );
}
