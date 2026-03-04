"use client";

import { Briefcase, MapPin, Clock, ArrowRight, Heart } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const benefits = [
  "Competitive compensation",
  "Health insurance options",
  "Paid time off",
  "Professional development opportunities",
  "Free event access",
  "Industry networking",
  "Creative work environment",
  "Community impact",
];

const quickLinks = [
  { href: "/careers/internships", label: "Internship Program", desc: "Hands-on radio & media experience" },
  { href: "/careers/volunteer", label: "Volunteer Opportunities", desc: "Give back to your community" },
  { href: "/careers/trainings", label: "Trainings & Guides", desc: "Develop your broadcasting skills" },
  { href: "/eeo", label: "EEO Information", desc: "Equal Employment Opportunity" },
];

export default function CareersPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    position: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 1000);
  };

  const handleReset = () => {
    setFormData({ name: "", email: "", phone: "", position: "", message: "" });
    setSubmitted(false);
  };

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-green-950/50 to-gray-900 border border-border/30">
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-xl">
              <Briefcase className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Careers at WCCG</h1>
              <p className="text-muted-foreground mt-1">Join the team behind Fayetteville&apos;s Hip Hop Station</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Why WCCG?</h2>
        <p className="text-muted-foreground leading-relaxed">
          Carson Communications / WCCG 104.5 FM is a dynamic media company serving the Fayetteville community.
          We&apos;re building the future of community radio — combining traditional broadcasting with cutting-edge
          digital platforms, live events, and creator tools. If you&apos;re passionate about media, music, and community,
          we want to hear from you.
        </p>
      </div>

      {/* Benefits */}
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-[#74ddc7]" />
          <h2 className="text-xl font-semibold text-foreground">Benefits & Perks</h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {benefits.map((b) => (
            <div key={b} className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-[#74ddc7]" />
              {b}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid gap-3 sm:grid-cols-2">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-input flex items-center justify-between"
          >
            <div>
              <h3 className="font-semibold text-foreground group-hover:text-[#74ddc7] transition-colors">{link.label}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{link.desc}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-foreground/20 group-hover:text-[#74ddc7] transition-colors" />
          </Link>
        ))}
      </div>

      {/* Application Form */}
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-foreground mb-4">Apply Now</h2>
        {submitted ? (
          <div className="text-center py-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#74ddc7]/10 mx-auto mb-3">
              <Briefcase className="h-7 w-7 text-[#74ddc7]" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Application Received!</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Thank you for your interest. Our team will review your application and contact you if there&apos;s a match.
            </p>
            <Button
              onClick={handleReset}
              className="mt-4 rounded-full bg-[#74ddc7] text-[#0a0a0f] font-bold hover:bg-[#5fc4b0] px-8"
            >
              Submit Another Application
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-foreground/60 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-border bg-foreground/[0.04] px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/20 focus:border-[#74ddc7] focus:outline-none"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="block text-sm text-foreground/60 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg border border-border bg-foreground/[0.04] px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/20 focus:border-[#74ddc7] focus:outline-none"
                  placeholder="you@email.com"
                />
              </div>
              <div>
                <label className="block text-sm text-foreground/60 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-lg border border-border bg-foreground/[0.04] px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/20 focus:border-[#74ddc7] focus:outline-none"
                  placeholder="(910) 555-0000"
                />
              </div>
              <div>
                <label className="block text-sm text-foreground/60 mb-1">Position Interest</label>
                <select
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full rounded-lg border border-border bg-foreground/[0.04] px-4 py-2.5 text-sm text-foreground focus:border-[#74ddc7] focus:outline-none"
                >
                  <option value="" className="bg-card">Select area of interest</option>
                  <option value="on-air" className="bg-card">On-Air Talent</option>
                  <option value="production" className="bg-card">Production</option>
                  <option value="sales" className="bg-card">Sales & Advertising</option>
                  <option value="engineering" className="bg-card">Engineering / Technical</option>
                  <option value="digital" className="bg-card">Digital / Web / Social</option>
                  <option value="events" className="bg-card">Events & Promotions</option>
                  <option value="admin" className="bg-card">Administrative</option>
                  <option value="other" className="bg-card">Other</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-foreground/60 mb-1">Tell us about yourself</label>
              <textarea
                rows={4}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full rounded-lg border border-border bg-foreground/[0.04] px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/20 focus:border-[#74ddc7] focus:outline-none resize-none"
                placeholder="Tell us about your experience, skills, and why you want to join WCCG..."
              />
            </div>
            <Button type="submit" disabled={submitting} className="rounded-full bg-[#74ddc7] text-[#0a0a0f] font-bold hover:bg-[#5fc4b0] px-8 disabled:opacity-60">
              {submitting ? "Submitting..." : "Submit Application"}
            </Button>
          </form>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 text-[#74ddc7]" />
          115 Gillespie Street, Fayetteville, NC 28301
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4 text-[#74ddc7]" />
          Office Hours: Monday – Friday, 8:30 AM – 5:30 PM
        </div>
        <p className="text-xs text-muted-foreground/70 mt-2">
          WCCG 104.5 FM / Carson Communications is an Equal Opportunity Employer.{" "}
          <Link href="/eeo" className="text-[#74ddc7] hover:underline">Learn more</Link>.
        </p>
      </div>
    </div>
  );
}
