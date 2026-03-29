"use client";

import { useState } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Store,
  CheckCircle2,
  Loader2,
  ShoppingBag,
  Coins,
  Megaphone,
  BarChart3,
  Users,
  Sparkles,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Benefits data
// ---------------------------------------------------------------------------

const BENEFITS = [
  {
    icon: ShoppingBag,
    title: "Marketplace Listing",
    description:
      "Showcase your products and services to the entire WCCG community.",
  },
  {
    icon: Coins,
    title: "Token System",
    description:
      "Accept WCCG tokens as payment and incentivize loyal customers.",
  },
  {
    icon: Megaphone,
    title: "Marketing Tools",
    description:
      "Promote your brand with on-air mentions, banner ads, and event sponsorships.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description:
      "Track sales, customer engagement, and revenue with real-time insights.",
  },
  {
    icon: Users,
    title: "Community Access",
    description:
      "Connect directly with thousands of engaged WCCG listeners and fans.",
  },
  {
    icon: Sparkles,
    title: "Exclusive Events",
    description:
      "Get priority vendor spots at WCCG concerts, festivals, and community events.",
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BecomeVendorPage() {
  const { supabase } = useSupabase();
  const { user, isLoading: authLoading } = useAuth();

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please sign in to apply.");
      return;
    }
    if (!businessName.trim() || !category.trim() || !description.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        vendor_application_status: "pending",
        business_name: businessName.trim(),
        business_category: category.trim(),
        business_description: description.trim(),
        business_website: website.trim() || null,
        business_phone: phone.trim() || null,
      })
      .eq("id", user.id);

    if (error) {
      toast.error("Could not submit application. " + error.message);
      setSubmitting(false);
      return;
    }

    toast.success("Application submitted successfully!");
    setSubmitted(true);
    setSubmitting(false);
  };

  // ---- Success state ----
  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="inline-flex items-center justify-center rounded-full bg-green-500/10 p-4">
          <CheckCircle2 size={48} className="text-green-400" />
        </div>
        <h1 className="text-3xl font-bold text-white">
          Application Submitted!
        </h1>
        <p className="text-zinc-400 max-w-md mx-auto">
          Thank you for applying to become a WCCG vendor. Our team will review
          your application and get back to you within 2-3 business days.
        </p>
        <Link href="/my/overview">
          <Button className="bg-amber-600 hover:bg-amber-500 text-white mt-4">
            Go to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-12">
      {/* Hero */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center rounded-full bg-amber-500/10 p-4">
          <Store size={40} className="text-amber-500" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white">
          Become a WCCG Vendor
        </h1>
        <p className="text-zinc-400 max-w-xl mx-auto">
          Join the WCCG 104.5 FM marketplace and grow your business with our
          community of listeners, fans, and supporters.
        </p>
      </div>

      {/* Benefits */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4 text-center">
          Vendor Perks
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {BENEFITS.map((b) => (
            <Card
              key={b.title}
              className="border-zinc-800 bg-zinc-900/40"
            >
              <CardContent className="p-4 flex gap-3">
                <div className="rounded-lg bg-amber-500/10 p-2 h-fit">
                  <b.icon size={20} className="text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{b.title}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {b.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Application form */}
      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Vendor Application
          </h2>

          {!user && !authLoading && (
            <p className="text-sm text-amber-400 mb-4">
              Please{" "}
              <Link href="/auth/login" className="underline hover:text-amber-300">
                sign in
              </Link>{" "}
              to submit your application.
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Business Name */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 uppercase tracking-wide">
                Business Name *
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Your business name"
                required
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Category */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 uppercase tracking-wide">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
              >
                <option value="">Select a category</option>
                <option value="food">Food & Beverage</option>
                <option value="apparel">Apparel & Fashion</option>
                <option value="beauty">Beauty & Wellness</option>
                <option value="services">Professional Services</option>
                <option value="entertainment">Entertainment</option>
                <option value="auto">Automotive</option>
                <option value="tech">Technology</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 uppercase tracking-wide">
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell us about your business and what you'd sell..."
                rows={4}
                required
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none resize-none"
              />
            </div>

            {/* Website */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 uppercase tracking-wide">
                Website
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourbusiness.com"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 uppercase tracking-wide">
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting || !user}
              className="bg-amber-600 hover:bg-amber-500 text-white w-full sm:w-auto"
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin mr-2" />
              ) : (
                <Send size={16} className="mr-2" />
              )}
              Submit Application
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
