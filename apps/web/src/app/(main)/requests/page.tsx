"use client";

import { RequestForm } from "@/components/requests/request-form";
import { RequestQueue } from "@/components/requests/request-queue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Music,
  Star,
  ArrowRight,
  Info,
  Radio,
  Headphones,
} from "lucide-react";

export default function RequestsPage() {
  return (
    <div className="space-y-10">
      {/* ── Hero Section ─────────────────────────────────────────────── */}
      <div className="relative -mx-4 -mt-8 overflow-hidden sm:-mx-6 md:-mx-8">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0f] via-[#0d1b2a] to-[#1a0533]" />
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-[#74ddc7]/10 blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 h-48 w-48 rounded-full bg-[#7401df]/10 blur-[80px]" />
        </div>

        <div className="relative px-6 py-16 sm:px-10 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#74ddc7]/10 border border-[#74ddc7]/20 px-4 py-1.5">
              <Music className="h-3.5 w-3.5 text-[#74ddc7]" />
              <span className="text-xs font-bold uppercase tracking-widest text-[#74ddc7]">
                Song Requests
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl">
              Request a <span className="text-[#74ddc7]">Song</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/60 sm:text-lg">
              Want to hear your favorite song on WCCG 104.5 FM? Submit a request
              and we will add it to the queue. Use priority requests to skip ahead!
            </p>
          </div>
        </div>
      </div>

      {/* ── Request Form ──────────────────────────────────────────────── */}
      <section>
        <RequestForm />
      </section>

      {/* ── Info Section ──────────────────────────────────────────────── */}
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          {
            icon: Radio,
            title: "Free Requests",
            desc: "Submit unlimited song requests at no cost. Songs are played in order.",
            color: "from-[#74ddc7] to-[#0d9488]",
          },
          {
            icon: Star,
            title: "Priority (25 pts)",
            desc: "Use 25 points to jump to the front of the queue with a priority request.",
            color: "from-[#f59e0b] to-[#d97706]",
          },
          {
            icon: Headphones,
            title: "DJ Curated",
            desc: "Our DJs review all requests. Songs that fit the current vibe play first.",
            color: "from-[#7401df] to-[#3b82f6]",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-xl border border-border bg-card p-5 transition-all hover:border-input"
          >
            <div
              className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${item.color}`}
            >
              <item.icon className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-semibold text-foreground">{item.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
          </div>
        ))}
      </section>

      {/* ── Live Queue ─────────────────────────────────────────────────── */}
      <section>
        <RequestQueue />
      </section>

      {/* ── Info Banner ────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-start gap-3 rounded-xl border border-[#f59e0b]/20 bg-[#f59e0b]/5 p-5">
          <Info className="h-5 w-5 shrink-0 text-[#f59e0b] mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              How Priority Requests Work
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Priority requests cost 25 points and jump to the front of the queue.
              They are marked with a star and reviewed by our DJs first. Regular
              requests are free and played in the order they are received. Earn
              points by listening to WCCG 104.5 FM!
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2 rounded-full text-xs border-[#f59e0b]/30 text-[#f59e0b] hover:bg-[#f59e0b]/10"
              asChild
            >
              <Link href="/rewards">
                Earn Points
                <ArrowRight className="ml-1.5 h-3 w-3" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
