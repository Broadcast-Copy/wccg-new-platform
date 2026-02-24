"use client";

import { Megaphone, BarChart3, Users, Radio, Target, TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const benefits = [
  {
    icon: Users,
    title: "Engaged Audience",
    description: "Reach thousands of active listeners across Fayetteville, Cumberland County, and 6 surrounding NC counties.",
  },
  {
    icon: Radio,
    title: "Multi-Platform Reach",
    description: "Your message reaches listeners on FM radio, 6 digital streams, our mobile app, website, and social media.",
  },
  {
    icon: Target,
    title: "Targeted Demographics",
    description: "Hip Hop, R&B, Soul, and Gospel audiences — reach the demographics that matter to your business.",
  },
  {
    icon: BarChart3,
    title: "Measurable Results",
    description: "Digital campaigns include analytics dashboards so you can track impressions, clicks, and engagement.",
  },
  {
    icon: TrendingUp,
    title: "Community Trust",
    description: "Leverage WCCG's decades of community trust and engagement to build your brand credibility.",
  },
  {
    icon: Megaphone,
    title: "Custom Campaigns",
    description: "From live reads and DJ endorsements to event sponsorships and digital ads — we build campaigns that work.",
  },
];

export default function AdvertisePage() {
  const [formData, setFormData] = useState({
    businessName: "",
    contactName: "",
    email: "",
    phone: "",
    budget: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-red-950/50 to-gray-900 border border-border/30">
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-700 shadow-xl">
              <Megaphone className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Advertise with WCCG</h1>
              <p className="text-white/50 mt-1">Reach our audience and grow your brand</p>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {benefits.map((item) => (
          <div
            key={item.title}
            className="rounded-xl border border-white/[0.06] bg-[#141420] p-5 transition-all hover:border-white/[0.12]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 mb-3">
              <item.icon className="h-5 w-5 text-red-400" />
            </div>
            <h3 className="font-semibold text-white mb-1">{item.title}</h3>
            <p className="text-sm text-white/40 leading-relaxed">{item.description}</p>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { href: "/advertise/portal", label: "Advertiser Portal", desc: "Manage your campaigns" },
          { href: "/advertise/guidelines", label: "Ad Guidelines", desc: "Specs & requirements" },
          { href: "/advertise/media-kit", label: "Media Kit", desc: "Rates & demographics" },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group rounded-xl border border-white/[0.06] bg-[#141420] p-5 transition-all hover:border-white/[0.12] flex items-center justify-between"
          >
            <div>
              <h3 className="font-semibold text-white group-hover:text-[#74ddc7] transition-colors">{link.label}</h3>
              <p className="text-xs text-white/40 mt-0.5">{link.desc}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-white/20 group-hover:text-[#74ddc7] transition-colors" />
          </Link>
        ))}
      </div>

      {/* Contact Form */}
      <div className="rounded-xl border border-white/[0.06] bg-[#141420] p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-white mb-4">Request Advertising Information</h2>
        {submitted ? (
          <div className="text-center py-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#74ddc7]/10 mx-auto mb-3">
              <Megaphone className="h-7 w-7 text-[#74ddc7]" />
            </div>
            <h3 className="text-lg font-semibold text-white">Thank you for your interest!</h3>
            <p className="text-sm text-white/50 mt-2">
              Our advertising team will reach out to you within 1-2 business days.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-white/60 mb-1">Business Name *</label>
                <input
                  type="text"
                  required
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-[#74ddc7] focus:outline-none"
                  placeholder="Your business name"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1">Contact Name *</label>
                <input
                  type="text"
                  required
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-[#74ddc7] focus:outline-none"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-[#74ddc7] focus:outline-none"
                  placeholder="email@business.com"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-[#74ddc7] focus:outline-none"
                  placeholder="(910) 555-0000"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">Monthly Budget Range</label>
              <select
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white focus:border-[#74ddc7] focus:outline-none"
              >
                <option value="" className="bg-[#141420]">Select a range</option>
                <option value="under-500" className="bg-[#141420]">Under $500</option>
                <option value="500-1000" className="bg-[#141420]">$500 – $1,000</option>
                <option value="1000-2500" className="bg-[#141420]">$1,000 – $2,500</option>
                <option value="2500-5000" className="bg-[#141420]">$2,500 – $5,000</option>
                <option value="5000-plus" className="bg-[#141420]">$5,000+</option>
                <option value="not-sure" className="bg-[#141420]">Not sure yet</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">Tell us about your goals</label>
              <textarea
                rows={4}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-[#74ddc7] focus:outline-none resize-none"
                placeholder="What are you looking to promote? What audience are you trying to reach?"
              />
            </div>
            <Button type="submit" className="rounded-full bg-[#dc2626] text-white font-bold hover:bg-[#b91c1c] px-8">
              Submit Inquiry
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
