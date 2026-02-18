"use client";

import { Button } from "@/components/ui/button";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import Link from "next/link";
import { Pause, Play, Radio } from "lucide-react";

const MAIN_STREAM_URL =
  process.env.NEXT_PUBLIC_MAIN_STREAM_URL || "https://stream.wccg.com/main";

export function Hero() {
  const { play, pause, isPlaying, currentStream } = useAudioPlayer();

  const isMainStreamPlaying = isPlaying && currentStream === MAIN_STREAM_URL;

  const handleListenLive = () => {
    if (isMainStreamPlaying) {
      pause();
    } else {
      play(MAIN_STREAM_URL, {
        streamName: "WCCG 104.5 FM",
        title: "Live Broadcast",
        artist: "WCCG 104.5 FM",
      });
    }
  };

  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 px-6 py-16 text-white md:px-12 md:py-24">
      {/* Decorative background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-purple-400 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-blue-400 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-400 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl space-y-6">
        <div className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-purple-300" />
          <span className="text-sm font-medium uppercase tracking-widest text-purple-300">
            Live Radio
          </span>
        </div>

        <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
          WCCG 104.5 FM
        </h1>

        <p className="text-lg text-white/80 md:text-xl">
          Charlotte&apos;s #1 Gospel Station. Uplifting your spirit 24/7 with
          the best in gospel music, inspiring talk shows, and community
          connection.
        </p>

        <div className="flex flex-wrap gap-3">
          <Button
            size="lg"
            onClick={handleListenLive}
            className="bg-white text-purple-900 hover:bg-white/90"
          >
            {isMainStreamPlaying ? (
              <>
                <Pause className="mr-2 h-5 w-5" />
                Pause Stream
              </>
            ) : (
              <>
                <Play className="mr-2 h-5 w-5" />
                Listen Live
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="border-white/30 text-white hover:bg-white/10"
            asChild
          >
            <Link href="/schedule">View Schedule</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
