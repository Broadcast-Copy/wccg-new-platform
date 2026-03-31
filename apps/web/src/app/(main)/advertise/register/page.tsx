"use client";

import { useState } from "react";
import {
  Megaphone,
  Database,
  Layers,
  MapPin,
  CheckCircle2,
  Loader2,
  LogIn,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

const INDUSTRIES = [
  "Automotive",
  "Education",
  "Entertainment",
  "Financial Services",
  "Food & Beverage",
  "Healthcare",
  "Home Services",
  "Legal",
  "Nonprofit",
  "Real Estate",
  "Retail",
  "Technology",
  "Other",
] as const;

const benefits = [
  {
    icon: Database,
    title: "First-Party Data",
    description:
      "Target real listeners, not guesses. Our audience data comes directly from engaged WCCG users.",
  },
  {
    icon: Layers,
    title: "Multi-Channel",
    description:
      "Radio + digital + social from one dashboard. Launch cross-platform campaigns in minutes.",
  },
  {
    icon: MapPin,
    title: "Local Reach",
    description:
      "9 NC counties, 200k+ potential listeners. Fayetteville's most engaged audience at your fingertips.",
  },
];

export default function AdvertiserRegisterPage() {
  const { supabase } = useSupabase();
  const { user, isLoading: authLoading } = useAuth();

  const [formData, setFormData] = useState({
    companyName: "",
    industry: "",
    website: "",
    phone: "",
    billingEmail: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const update = (field: string, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("dsp_advertisers").insert({
        user_id: user.id,
        company_name: formData.companyName,
        industry: formData.industry,
        website: formData.website || null,
        phone: formData.phone || null,
        billing_email: formData.billingEmail,
        status: "pending",
      });

      if (error) throw error;

      setSubmitted(true);
      toast.success("Application submitted!");
    } catch (err: any) {
      console.error("Registration error:", err);
      toast.error(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-border bg-foreground/[0.04] px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/20 focus:border-amber-500 focus:outline-none";

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-amber-950/40 to-gray-900 border border-border/30">
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 shadow-xl">
              <Megaphone className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Advertise on WCCG 104.5 FM
              </h1>
              <p className="text-muted-foreground mt-1">
                Reach Fayetteville&apos;s most engaged audience across radio,
                digital, and social
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        {benefits.map((item) => (
          <div
            key={item.title}
            className="rounded-xl border border-border bg-card p-5 transition-all hover:border-amber-500/40"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 mb-3">
              <item.icon className="h-5 w-5 text-amber-400" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {item.description}
            </p>
          </div>
        ))}
      </div>

      {/* Registration Form */}
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-foreground mb-1">
          Advertiser Registration
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Complete the form below to apply for an advertiser account.
        </p>

        {/* Auth guard */}
        {authLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
          </div>
        ) : !user ? (
          <div className="text-center py-10 space-y-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 mx-auto">
              <LogIn className="h-7 w-7 text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              Sign in to get started
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              You need a WCCG account before registering as an advertiser. Sign
              in or create an account to continue.
            </p>
            <Link href="/login">
              <Button className="rounded-full bg-amber-500 text-white font-bold hover:bg-amber-600 px-8 mt-2">
                Sign In
              </Button>
            </Link>
          </div>
        ) : submitted ? (
          /* Success state */
          <div className="text-center py-10 space-y-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 mx-auto">
              <CheckCircle2 className="h-7 w-7 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              Application submitted!
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              We&apos;ll review your application within 24 hours. You&apos;ll
              receive a confirmation email at{" "}
              <span className="text-foreground font-medium">
                {formData.billingEmail}
              </span>
              .
            </p>
            <Link href="/advertise">
              <Button className="rounded-full bg-amber-500 text-white font-bold hover:bg-amber-600 px-8 mt-2">
                Back to Advertising
              </Button>
            </Link>
          </div>
        ) : (
          /* Registration form */
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Company Name */}
              <div className="space-y-1.5">
                <Label className="text-sm text-foreground/60">
                  Company Name *
                </Label>
                <Input
                  required
                  value={formData.companyName}
                  onChange={(e) => update("companyName", e.target.value)}
                  className={inputClass}
                  placeholder="Acme Marketing LLC"
                />
              </div>

              {/* Industry */}
              <div className="space-y-1.5">
                <Label className="text-sm text-foreground/60">
                  Industry *
                </Label>
                <select
                  required
                  value={formData.industry}
                  onChange={(e) => update("industry", e.target.value)}
                  className={inputClass}
                >
                  <option value="" className="bg-card">
                    Select your industry
                  </option>
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind} className="bg-card">
                      {ind}
                    </option>
                  ))}
                </select>
              </div>

              {/* Website */}
              <div className="space-y-1.5">
                <Label className="text-sm text-foreground/60">Website</Label>
                <Input
                  type="url"
                  value={formData.website}
                  onChange={(e) => update("website", e.target.value)}
                  className={inputClass}
                  placeholder="https://yourcompany.com"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label className="text-sm text-foreground/60">Phone</Label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  className={inputClass}
                  placeholder="(910) 555-0000"
                />
              </div>
            </div>

            {/* Billing Email — full width */}
            <div className="space-y-1.5">
              <Label className="text-sm text-foreground/60">
                Billing Email *
              </Label>
              <Input
                type="email"
                required
                value={formData.billingEmail}
                onChange={(e) => update("billingEmail", e.target.value)}
                className={inputClass}
                placeholder="billing@yourcompany.com"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-amber-500 text-white font-bold hover:bg-amber-600 px-8 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Application"
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
