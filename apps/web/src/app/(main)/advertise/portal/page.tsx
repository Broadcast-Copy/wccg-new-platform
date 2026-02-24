"use client";

import { LayoutDashboard, BarChart3, FileText, CreditCard, Settings, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const portalFeatures = [
  {
    icon: BarChart3,
    title: "Campaign Analytics",
    description: "Track impressions, reach, frequency, and listener engagement for all your active campaigns.",
  },
  {
    icon: FileText,
    title: "Ad Scheduling",
    description: "View your ad schedule, dayparts, and rotation details across all WCCG channels.",
  },
  {
    icon: CreditCard,
    title: "Billing & Invoices",
    description: "Access invoices, payment history, and manage your advertising account billing.",
  },
  {
    icon: Settings,
    title: "Creative Management",
    description: "Upload and manage your ad creative, scripts, and promotional materials.",
  },
];

export default function AdvertiserPortalPage() {
  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-red-950/50 to-gray-900 border border-border/30">
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-700 shadow-xl">
              <LayoutDashboard className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Advertiser Portal</h1>
              <p className="text-white/50 mt-1">Manage your WCCG advertising campaigns</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-[#141420] p-6 sm:p-8 text-center space-y-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04] mx-auto">
          <LayoutDashboard className="h-8 w-8 text-white/30" />
        </div>
        <h2 className="text-xl font-semibold text-white">Sign in to Your Portal</h2>
        <p className="text-white/50 text-sm max-w-md mx-auto">
          Access your advertising dashboard to view campaigns, analytics, invoices, and manage your ad creative.
        </p>
        <div className="flex justify-center gap-3">
          <Button asChild className="rounded-full bg-[#dc2626] text-white font-bold hover:bg-[#b91c1c] px-6">
            <Link href="/login">
              Sign In
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full border-white/20 text-white hover:bg-white/5 px-6">
            <Link href="/advertise">Become an Advertiser</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {portalFeatures.map((feature) => (
          <div key={feature.title} className="rounded-xl border border-white/[0.06] bg-[#141420] p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 mb-3">
              <feature.icon className="h-5 w-5 text-red-400" />
            </div>
            <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
            <p className="text-sm text-white/40 leading-relaxed">{feature.description}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-[#141420] p-6 text-center">
        <p className="text-white/50 text-sm">
          Need help with your portal?{" "}
          <Link href="/contact" className="text-[#74ddc7] hover:underline">Contact our advertising team</Link>
          {" "}or call (910) 484-4932.
        </p>
      </div>
    </div>
  );
}
