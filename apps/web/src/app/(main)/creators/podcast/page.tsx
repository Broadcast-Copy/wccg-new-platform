"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Podcast,
  Mic,
  Headphones,
  Upload,
  Share2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Radio,
  Video,
  Camera,
  Send,
  User,
  Mail,
  Phone,
  FileText,
  Target,
  LinkIcon,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Constants ──────────────────────────────────────────────────────────

const howItWorks = [
  {
    step: "1",
    icon: Mic,
    title: "Apply",
    description:
      "Submit your podcast concept through the form below. Include your show idea, target audience, and sample content.",
  },
  {
    step: "2",
    icon: Headphones,
    title: "Onboard",
    description:
      "Our team reviews your submission and works with you on show format, branding, and scheduling.",
  },
  {
    step: "3",
    icon: Upload,
    title: "Produce & Upload",
    description:
      "Record your episodes and upload them through the mY1045 creator dashboard. We handle hosting and distribution.",
  },
  {
    step: "4",
    icon: Share2,
    title: "Promote & Grow",
    description:
      "We promote your podcast across our platforms — on-air mentions, social media, and featured placement in the mY1045 app.",
  },
];

const features = [
  "Unlimited episode hosting on the mY1045 platform",
  "Distribution to major podcast directories (Apple, Spotify, Google)",
  "On-air promotion across WCCG's 6 channels",
  "Social media cross-promotion to our audience",
  "Episode analytics and listener demographics",
  "Featured placement in the mY1045 app",
  "Access to WCCG studio space (availability permitting)",
  "Collaboration opportunities with WCCG hosts and DJs",
];

const PODCAST_CATEGORIES = [
  "Arts & Culture",
  "Business & Finance",
  "Comedy",
  "Community & Local",
  "Education",
  "Faith & Spirituality",
  "Health & Fitness",
  "History",
  "Kids & Family",
  "Lifestyle",
  "Music",
  "News & Politics",
  "Science & Technology",
  "Society & Culture",
  "Sports",
  "True Crime",
] as const;

type ProductionType = "audio" | "video-live" | "video-recorded";

const PRODUCTION_OPTIONS = [
  { key: "audio" as const, label: "Audio", sub: "Podcast", icon: Mic, color: "#7401df" },
  { key: "video-live" as const, label: "Live", sub: "Broadcast", icon: Radio, color: "#dc2626" },
  { key: "video-recorded" as const, label: "Record", sub: "& Edit", icon: Video, color: "#74ddc7" },
];

// ─── Form Steps ─────────────────────────────────────────────────────────

const FORM_STEPS = [
  { label: "Contact", icon: User },
  { label: "Show Details", icon: Podcast },
  { label: "Production", icon: Mic },
  { label: "Review", icon: Send },
];

// ─── Component ──────────────────────────────────────────────────────────

export default function PodcastPage() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    hostName: "",
    email: "",
    phone: "",
    showTitle: "",
    category: "",
    description: "",
    targetAudience: "",
    productionType: "audio" as ProductionType,
    experience: "",
    sampleUrl: "",
    additionalInfo: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const totalSteps = FORM_STEPS.length;

  function nextStep() {
    if (step < totalSteps - 1) setStep(step + 1);
  }
  function prevStep() {
    if (step > 0) setStep(step - 1);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  // ── Shared input classes ──────────────────────────────────────────
  const inputClass =
    "w-full rounded-lg border border-border bg-foreground/[0.04] px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-[#74ddc7] focus:outline-none transition-colors";
  const labelClass = "block text-sm text-foreground/60 mb-1.5";

  return (
    <div className="space-y-8">
      {/* ── Hero Banner ──────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-background via-[#7401df]/5 to-background dark:from-gray-900 dark:via-purple-950/50 dark:to-gray-900 border border-border/30">
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7401df] to-[#3b82f6] shadow-xl">
              <Podcast className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Podcast &amp; Launch
              </h1>
              <p className="text-muted-foreground mt-1">
                Start your podcast with WCCG&apos;s platform and reach
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Launch Your Voice ────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-semibold text-foreground">
          Launch Your Voice
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          The WCCG Podcast Program gives local voices a platform to be heard.
          Whether you&apos;re launching your first show or looking for a better
          home for your existing podcast, we provide the hosting, distribution,
          and promotion you need to reach a wider audience.
        </p>
      </div>

      {/* ── How It Works Steps ───────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">How It Works</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {howItWorks.map((item) => (
            <div
              key={item.step}
              className="rounded-xl border border-border bg-card p-5 space-y-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7401df] text-white text-sm font-bold">
                  {item.step}
                </span>
                <item.icon className="h-5 w-5 text-muted-foreground/70" />
              </div>
              <h3 className="font-semibold text-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── What You Get ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-semibold text-foreground">What You Get</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {features.map((f, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-sm text-muted-foreground"
            >
              <CheckCircle2 className="h-4 w-4 text-[#74ddc7] mt-0.5 shrink-0" />
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* ── Content Guidelines ───────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-semibold text-foreground">
          Content Guidelines
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Podcasts on the WCCG platform must align with our community values.
          Content should be original, engaging, and appropriate for a general
          audience. We welcome shows covering music, culture, community, sports,
          business, faith, lifestyle, and education. Explicit content must be
          clearly labeled. WCCG reserves the right to review and approve all
          content before publication.
        </p>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MULTI-STEP APPLICATION FORM
          ═══════════════════════════════════════════════════════════════ */}
      <div className="rounded-xl border border-[#7401df]/30 bg-card overflow-hidden">
        {/* Form header */}
        <div className="border-b border-border px-6 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#7401df]/10">
              <Sparkles className="h-5 w-5 text-[#7401df]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Apply to Launch Your Podcast
              </h2>
              <p className="text-sm text-muted-foreground">
                Complete all sections below to submit your application
              </p>
            </div>
          </div>
        </div>

        {submitted ? (
          /* ── Success State ─────────────────────────────────────── */
          <div className="text-center px-6 py-14 sm:px-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#74ddc7]/10 mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-[#74ddc7]" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              Application Submitted!
            </h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              Thank you for your interest in the WCCG Podcast Program. Our
              creator team will review your application and get back to you
              within 5 business days.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => {
                  setSubmitted(false);
                  setStep(0);
                  setFormData({
                    hostName: "",
                    email: "",
                    phone: "",
                    showTitle: "",
                    category: "",
                    description: "",
                    targetAudience: "",
                    productionType: "audio",
                    experience: "",
                    sampleUrl: "",
                    additionalInfo: "",
                  });
                }}
              >
                Submit Another
              </Button>
              <Button
                asChild
                className="rounded-full bg-[#7401df] text-white hover:bg-[#5c00b3]"
              >
                <Link href="/creators">
                  Explore Creator Program
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* ── Step Indicator ──────────────────────────────────── */}
            <div className="border-b border-border px-6 py-4 sm:px-8">
              <div className="flex items-center justify-between">
                {FORM_STEPS.map((s, i) => {
                  const isCompleted = i < step;
                  const isCurrent = i === step;
                  return (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => {
                        if (i <= step) setStep(i);
                      }}
                      className={`flex items-center gap-2 transition-colors ${
                        isCurrent
                          ? "text-[#7401df]"
                          : isCompleted
                            ? "text-[#74ddc7] cursor-pointer"
                            : "text-muted-foreground/40 cursor-default"
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                          isCurrent
                            ? "bg-[#7401df] text-white"
                            : isCompleted
                              ? "bg-[#74ddc7]/15 text-[#74ddc7]"
                              : "bg-foreground/[0.06] text-muted-foreground/40"
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          i + 1
                        )}
                      </span>
                      <span className="hidden sm:block text-sm font-medium">
                        {s.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Progress bar */}
              <div className="mt-3 h-1 rounded-full bg-foreground/[0.06]">
                <div
                  className="h-1 rounded-full bg-[#7401df] transition-all duration-300"
                  style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
                />
              </div>
            </div>

            {/* ── Form Content ────────────────────────────────────── */}
            <form onSubmit={handleSubmit}>
              <div className="px-6 py-6 sm:px-8 min-h-[320px]">
                {/* ──── Step 1: Contact Info ───────────────────────── */}
                {step === 0 && (
                  <div className="space-y-5 animate-in fade-in duration-300">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-4 w-4 text-[#7401df]" />
                      <h3 className="font-semibold text-foreground">
                        Contact Information
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground -mt-3">
                      How can we reach you about your application?
                    </p>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className={labelClass}>
                          <span className="flex items-center gap-1.5">
                            <User className="h-3 w-3" />
                            Name / Host Name{" "}
                            <span className="text-red-500">*</span>
                          </span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.hostName}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              hostName: e.target.value,
                            })
                          }
                          className={inputClass}
                          placeholder="Your name or on-air name"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>
                          <span className="flex items-center gap-1.5">
                            <Mail className="h-3 w-3" />
                            Email <span className="text-red-500">*</span>
                          </span>
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              email: e.target.value,
                            })
                          }
                          className={inputClass}
                          placeholder="you@email.com"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelClass}>
                          <span className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3" />
                            Phone{" "}
                            <span className="text-muted-foreground/40 text-xs font-normal">
                              (optional)
                            </span>
                          </span>
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              phone: e.target.value,
                            })
                          }
                          className={`${inputClass} sm:max-w-xs`}
                          placeholder="(910) 555-0123"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ──── Step 2: Show Details ───────────────────────── */}
                {step === 1 && (
                  <div className="space-y-5 animate-in fade-in duration-300">
                    <div className="flex items-center gap-2 mb-1">
                      <Podcast className="h-4 w-4 text-[#7401df]" />
                      <h3 className="font-semibold text-foreground">
                        Show Details
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground -mt-3">
                      Tell us about the podcast you want to create
                    </p>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className={labelClass}>
                          <span className="flex items-center gap-1.5">
                            <FileText className="h-3 w-3" />
                            Show Title{" "}
                            <span className="text-red-500">*</span>
                          </span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.showTitle}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              showTitle: e.target.value,
                            })
                          }
                          className={inputClass}
                          placeholder="Your podcast name"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>
                          <span className="flex items-center gap-1.5">
                            <Podcast className="h-3 w-3" />
                            Category{" "}
                            <span className="text-red-500">*</span>
                          </span>
                        </label>
                        <select
                          required
                          value={formData.category}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              category: e.target.value,
                            })
                          }
                          className={inputClass}
                        >
                          <option value="" className="bg-card">
                            Select category
                          </option>
                          {PODCAST_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat} className="bg-card">
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelClass}>
                          <span className="flex items-center gap-1.5">
                            <Target className="h-3 w-3" />
                            Target Audience{" "}
                            <span className="text-red-500">*</span>
                          </span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.targetAudience}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              targetAudience: e.target.value,
                            })
                          }
                          className={inputClass}
                          placeholder="e.g. Young professionals, music fans, parents, local community"
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>
                        Show Description{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        className={`${inputClass} resize-none`}
                        placeholder="Describe your podcast concept — what topics will you cover, what makes it unique, and what listeners can expect..."
                      />
                    </div>
                  </div>
                )}

                {/* ──── Step 3: Production & Experience ────────────── */}
                {step === 2 && (
                  <div className="space-y-5 animate-in fade-in duration-300">
                    <div className="flex items-center gap-2 mb-1">
                      <Mic className="h-4 w-4 text-[#7401df]" />
                      <h3 className="font-semibold text-foreground">
                        Production &amp; Experience
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground -mt-3">
                      How do you plan to produce your show?
                    </p>

                    {/* Production Type */}
                    <div>
                      <label className={labelClass}>Production Type</label>
                      <div className="grid grid-cols-3 gap-2 sm:max-w-sm">
                        {PRODUCTION_OPTIONS.map((opt) => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                productionType: opt.key,
                              })
                            }
                            className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 transition-all text-center ${
                              formData.productionType === opt.key
                                ? ""
                                : "border-border bg-foreground/[0.02] hover:border-foreground/[0.15]"
                            }`}
                            style={
                              formData.productionType === opt.key
                                ? {
                                    borderColor: opt.color,
                                    backgroundColor: `${opt.color}1a`,
                                    boxShadow: `0 0 0 1px ${opt.color}4d`,
                                  }
                                : undefined
                            }
                          >
                            <opt.icon
                              className={`h-5 w-5 ${formData.productionType !== opt.key ? "text-muted-foreground" : ""}`}
                              style={
                                formData.productionType === opt.key
                                  ? { color: opt.color }
                                  : undefined
                              }
                            />
                            <p
                              className={`text-[11px] font-semibold leading-tight ${formData.productionType !== opt.key ? "text-foreground/60" : ""}`}
                              style={
                                formData.productionType === opt.key
                                  ? { color: opt.color }
                                  : undefined
                              }
                            >
                              {opt.label}
                            </p>
                            <p className="text-[9px] text-muted-foreground/70 leading-tight">
                              {opt.sub}
                            </p>
                          </button>
                        ))}
                      </div>

                      {formData.productionType !== "audio" && (
                        <div className="mt-2 rounded-lg border border-border bg-foreground/[0.03] p-2.5 sm:max-w-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <Camera className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-[11px] font-semibold text-foreground/70">
                              {formData.productionType === "video-live"
                                ? "Live Video Studio"
                                : "Video Recording Studio"}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground leading-relaxed">
                            2-camera setup with multi-track audio.
                            {formData.productionType === "video-live"
                              ? " Stream live to listeners in real-time."
                              : " Record, edit, then publish."}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className={labelClass}>
                          Podcasting Experience
                        </label>
                        <select
                          value={formData.experience}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              experience: e.target.value,
                            })
                          }
                          className={inputClass}
                        >
                          <option value="" className="bg-card">
                            Select experience level
                          </option>
                          <option value="new" className="bg-card">
                            Brand new — never podcasted
                          </option>
                          <option value="some" className="bg-card">
                            Some experience (1-10 episodes)
                          </option>
                          <option value="experienced" className="bg-card">
                            Experienced (10+ episodes)
                          </option>
                          <option value="professional" className="bg-card">
                            Professional podcaster
                          </option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>
                          <span className="flex items-center gap-1.5">
                            <LinkIcon className="h-3 w-3" />
                            Sample Content URL{" "}
                            <span className="text-muted-foreground/40 text-xs font-normal">
                              (optional)
                            </span>
                          </span>
                        </label>
                        <input
                          type="url"
                          value={formData.sampleUrl}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              sampleUrl: e.target.value,
                            })
                          }
                          className={inputClass}
                          placeholder="https://soundcloud.com/your-demo"
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>
                        Anything else you&apos;d like us to know?{" "}
                        <span className="text-muted-foreground/40 text-xs font-normal">
                          (optional)
                        </span>
                      </label>
                      <textarea
                        rows={3}
                        value={formData.additionalInfo}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            additionalInfo: e.target.value,
                          })
                        }
                        className={`${inputClass} resize-none`}
                        placeholder="Equipment you have, preferred recording schedule, collaboration interests..."
                      />
                    </div>
                  </div>
                )}

                {/* ──── Step 4: Review & Submit ────────────────────── */}
                {step === 3 && (
                  <div className="space-y-5 animate-in fade-in duration-300">
                    <div className="flex items-center gap-2 mb-1">
                      <Send className="h-4 w-4 text-[#7401df]" />
                      <h3 className="font-semibold text-foreground">
                        Review &amp; Submit
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground -mt-3">
                      Please review your application before submitting
                    </p>

                    <div className="space-y-4">
                      {/* Contact summary */}
                      <div className="rounded-lg border border-border p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Contact Info
                          </h4>
                          <button
                            type="button"
                            onClick={() => setStep(0)}
                            className="text-xs text-[#7401df] hover:underline"
                          >
                            Edit
                          </button>
                        </div>
                        <div className="grid gap-1 sm:grid-cols-2 text-sm">
                          <p>
                            <span className="text-muted-foreground">Name:</span>{" "}
                            <span className="text-foreground font-medium">
                              {formData.hostName || "—"}
                            </span>
                          </p>
                          <p>
                            <span className="text-muted-foreground">
                              Email:
                            </span>{" "}
                            <span className="text-foreground font-medium">
                              {formData.email || "—"}
                            </span>
                          </p>
                          {formData.phone && (
                            <p>
                              <span className="text-muted-foreground">
                                Phone:
                              </span>{" "}
                              <span className="text-foreground font-medium">
                                {formData.phone}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Show details summary */}
                      <div className="rounded-lg border border-border p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Show Details
                          </h4>
                          <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="text-xs text-[#7401df] hover:underline"
                          >
                            Edit
                          </button>
                        </div>
                        <div className="grid gap-1 sm:grid-cols-2 text-sm">
                          <p>
                            <span className="text-muted-foreground">
                              Title:
                            </span>{" "}
                            <span className="text-foreground font-medium">
                              {formData.showTitle || "—"}
                            </span>
                          </p>
                          <p>
                            <span className="text-muted-foreground">
                              Category:
                            </span>{" "}
                            <span className="text-foreground font-medium">
                              {formData.category || "—"}
                            </span>
                          </p>
                          <p className="sm:col-span-2">
                            <span className="text-muted-foreground">
                              Audience:
                            </span>{" "}
                            <span className="text-foreground font-medium">
                              {formData.targetAudience || "—"}
                            </span>
                          </p>
                        </div>
                        {formData.description && (
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {formData.description}
                          </p>
                        )}
                      </div>

                      {/* Production summary */}
                      <div className="rounded-lg border border-border p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Production
                          </h4>
                          <button
                            type="button"
                            onClick={() => setStep(2)}
                            className="text-xs text-[#7401df] hover:underline"
                          >
                            Edit
                          </button>
                        </div>
                        <div className="grid gap-1 sm:grid-cols-2 text-sm">
                          <p>
                            <span className="text-muted-foreground">Type:</span>{" "}
                            <span className="text-foreground font-medium capitalize">
                              {formData.productionType === "video-live"
                                ? "Live Video"
                                : formData.productionType === "video-recorded"
                                  ? "Recorded Video"
                                  : "Audio Podcast"}
                            </span>
                          </p>
                          {formData.experience && (
                            <p>
                              <span className="text-muted-foreground">
                                Experience:
                              </span>{" "}
                              <span className="text-foreground font-medium capitalize">
                                {formData.experience}
                              </span>
                            </p>
                          )}
                          {formData.sampleUrl && (
                            <p className="sm:col-span-2">
                              <span className="text-muted-foreground">
                                Sample:
                              </span>{" "}
                              <span className="text-[#74ddc7] font-medium break-all">
                                {formData.sampleUrl}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Navigation Footer ──────────────────────────────── */}
              <div className="border-t border-border px-6 py-4 sm:px-8 flex items-center justify-between">
                <div>
                  {step > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={prevStep}
                      className="rounded-full gap-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    Step {step + 1} of {totalSteps}
                  </span>
                  {step < totalSteps - 1 ? (
                    <Button
                      type="button"
                      onClick={nextStep}
                      className="rounded-full bg-[#7401df] text-white font-bold hover:bg-[#5c00b3] gap-2 px-6"
                    >
                      Next
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      className="rounded-full bg-[#7401df] text-white font-bold hover:bg-[#5c00b3] gap-2 px-6"
                    >
                      <Send className="h-4 w-4" />
                      Submit Application
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
