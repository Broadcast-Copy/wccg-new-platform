"use client";

import { useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Palette,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

const TOTAL_STEPS = 9;

const contentTypes = [
  "Short-Form Video (Reels, TikTok, Shorts)",
  "Long-Form Video",
  "Behind-the-Scenes Content",
  "Promotional Video / Ad",
  "Interview Clip",
  "Lifestyle or Branding Video",
  "Graphic Design / Social Banners",
  "Voiceover-Driven Content",
  "Event Recap Video",
  "Other",
];

const goalOptions = [
  "Brand Awareness",
  "Product Promotion",
  "Event Promotion",
  "Engagement & Growth",
  "Educational / Informational",
  "Testimonial / Storytelling",
  "Other",
];

const toneOptions = [
  "High Energy",
  "Professional",
  "Fun & Playful",
  "Inspirational",
  "Emotional",
  "Trendy / Social-Driven",
  "Storytelling-Driven",
  "Other",
];

const contentIncludes = [
  "Voiceover",
  "On-screen talent",
  "Text overlays",
  "Background music",
  "Captions",
  "Motion graphics",
  "None",
  "Not sure",
];

const publishPlatforms = [
  "Instagram",
  "Facebook",
  "TikTok",
  "YouTube",
  "Website",
  "TV / Digital Ad Placement",
  "Other",
];

function RadioOption({
  name,
  value,
  label,
  checked,
  onChange,
}: {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <div
        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
          checked
            ? "border-[#74ddc7] bg-[#74ddc7]"
            : "border-white/30 group-hover:border-white/50"
        }`}
        onClick={() => onChange(value)}
      >
        {checked && <div className="w-2 h-2 rounded-full bg-[#0a0a0f]" />}
      </div>
      <span
        className="text-sm text-white/70 group-hover:text-white/90"
        onClick={() => onChange(value)}
      >
        {label}
      </span>
    </label>
  );
}

function CheckboxOption({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <div
        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
          checked
            ? "border-[#74ddc7] bg-[#74ddc7]"
            : "border-white/30 group-hover:border-white/50"
        }`}
      >
        {checked && (
          <svg
            className="w-3 h-3 text-[#0a0a0f]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </div>
      <span className="text-sm text-white/70 group-hover:text-white/90">
        {label}
      </span>
    </label>
  );
}

export default function SocialContentPage() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    // Step 1
    projectTitle: "",
    contentType: "",
    projectDescription: "",
    // Step 2
    mainGoal: "",
    targetAudience: "",
    toneStyle: [] as string[],
    // Step 3
    hasBrandColors: "",
    brandColorDescription: "",
    // Step 4
    referenceLink1: "",
    referenceLink2: "",
    referenceLink3: "",
    provideFootage: "",
    fileTypes: "",
    // Step 5
    needOnSiteFilming: "",
    filmingLocation: "",
    recordingDate1: "",
    recordingTime1: "",
    recordingDate2: "",
    recordingTime2: "",
    multipleCameras: "",
    contentIncludes: [] as string[],
    // Step 6
    publishPlatforms: [] as string[],
    finishedPieces: "",
    aspectRatio: "",
    deliveryTimeline: "",
    // Step 7
    handlePosting: "",
    analyticsTracking: "",
    needCaption: "",
    // Step 8
    budget: "",
    needQuote: "",
    // Step 9
    name: "",
    businessName: "",
    email: "",
    phone: "",
    contactMethod: "",
  });

  const progress = Math.round((step / TOTAL_STEPS) * 100);

  const updateField = (field: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field: string, item: string) => {
    setFormData((prev) => {
      const arr = (prev as Record<string, unknown>)[field] as string[];
      return {
        ...prev,
        [field]: arr.includes(item)
          ? arr.filter((i) => i !== item)
          : [...arr, item],
      };
    });
  };

  if (submitted) {
    return (
      <div className="space-y-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-pink-950/50 to-gray-900 border border-border/30 p-10 text-center">
          <CheckCircle2 className="h-16 w-16 text-[#74ddc7] mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-3">
            Request Submitted!
          </h1>
          <p className="text-gray-400 max-w-md mx-auto mb-6">
            Thank you for your social content creation request. Our creative
            team will review your submission and contact you within 1-2 business
            days.
          </p>
          <Button
            asChild
            className="rounded-full bg-gradient-to-r from-[#ec4899] to-[#be185d] text-white font-semibold px-6"
          >
            <Link href="/studio">Back to Studios</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-pink-950/50 to-gray-900 border border-border/30">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, rgba(236,72,153,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 30%, rgba(116,221,199,0.2) 0%, transparent 50%)`,
            }}
          />
        </div>
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ec4899] to-[#be185d] shadow-xl shadow-pink-500/20">
              <Palette className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">
                Social Content Creation
              </h1>
              <p className="text-base text-gray-400 max-w-2xl">
                Create social content that captures attention and drives
                engagement. Your story deserves to stand out — let us help you
                bring it to life.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pre-form info */}
      <div className="rounded-xl border border-white/[0.06] bg-[#141420] p-6">
        <h2 className="text-lg font-semibold text-white mb-3">
          Before You Begin
        </h2>
        <p className="text-sm text-white/50 mb-4">
          Please have the following ready before completing this form:
        </p>
        <ul className="space-y-2">
          {[
            "Your content idea or campaign concept",
            "A short description of your goals or message",
            "Your logo, branding assets, or visual style references",
            "Any sample content or inspiration you'd like reviewed",
            "Your preferred content format and publishing timeline",
          ].map((item) => (
            <li
              key={item}
              className="flex items-center gap-2 text-sm text-white/60"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-[#74ddc7] shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Form */}
      <div className="rounded-xl border border-white/[0.06] bg-[#141420] overflow-hidden">
        <div className="border-b border-white/[0.06] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">
              Step {step} of {TOTAL_STEPS}
            </span>
            <span className="text-xs font-bold text-[#74ddc7]">
              {progress}%
            </span>
          </div>
          <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#ec4899] to-[#74ddc7] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Step 1: Project Details */}
          {step === 1 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-white">
                Project Details
              </h3>
              <div>
                <Label className="text-white/70">
                  Project Title or Working Title
                </Label>
                <Input
                  value={formData.projectTitle}
                  onChange={(e) => updateField("projectTitle", e.target.value)}
                  className="mt-1 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25"
                />
              </div>
              <div>
                <Label className="text-white/70">
                  Type of Content Requested
                </Label>
                <select
                  value={formData.contentType}
                  onChange={(e) => updateField("contentType", e.target.value)}
                  className="mt-1 w-full rounded-md bg-white/[0.04] border border-white/[0.08] text-white/70 px-3 py-2 text-sm"
                >
                  <option value="" className="bg-[#141420]">
                    Select content type...
                  </option>
                  {contentTypes.map((type) => (
                    <option key={type} value={type} className="bg-[#141420]">
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-white/70">
                  Brief Project Description
                </Label>
                <Textarea
                  value={formData.projectDescription}
                  onChange={(e) =>
                    updateField("projectDescription", e.target.value)
                  }
                  placeholder="Describe your idea, theme, message, or overall vision."
                  className="mt-1 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 min-h-[100px]"
                />
              </div>
            </div>
          )}

          {/* Step 2: Goals & Audience */}
          {step === 2 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-white">
                Goals &amp; Audience
              </h3>
              <div>
                <Label className="text-white/70">
                  What is the main goal of this content?
                </Label>
                <select
                  value={formData.mainGoal}
                  onChange={(e) => updateField("mainGoal", e.target.value)}
                  className="mt-1 w-full rounded-md bg-white/[0.04] border border-white/[0.08] text-white/70 px-3 py-2 text-sm"
                >
                  <option value="" className="bg-[#141420]">
                    Select goal...
                  </option>
                  {goalOptions.map((goal) => (
                    <option key={goal} value={goal} className="bg-[#141420]">
                      {goal}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-white/70">
                  Who is your target audience?
                </Label>
                <Input
                  value={formData.targetAudience}
                  onChange={(e) =>
                    updateField("targetAudience", e.target.value)
                  }
                  placeholder="Describe your target audience..."
                  className="mt-1 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25"
                />
              </div>
              <div>
                <Label className="text-white/70 mb-2 block">
                  What tone or style do you want the content to have?
                </Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {toneOptions.map((tone) => (
                    <CheckboxOption
                      key={tone}
                      label={tone}
                      checked={formData.toneStyle.includes(tone)}
                      onChange={() => toggleArrayItem("toneStyle", tone)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Branding Information */}
          {step === 3 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-white">
                Branding Information
              </h3>
              <div>
                <Label className="text-white/70">
                  Upload Your Logo or Branding Assets
                </Label>
                <div className="mt-2 rounded-lg border border-dashed border-white/[0.12] p-6 text-center cursor-pointer hover:border-white/[0.2] transition-colors">
                  <p className="text-sm text-white/40">
                    Click or drag a file to upload
                  </p>
                </div>
              </div>
              <div>
                <Label className="text-white/70 mb-2 block">
                  Do you have brand colors or style guidelines?
                </Label>
                <div className="flex flex-wrap gap-4">
                  {[
                    "Yes (upload or describe)",
                    "No",
                    "Not sure",
                  ].map((opt) => (
                    <RadioOption
                      key={opt}
                      name="hasBrandColors"
                      value={opt}
                      label={opt}
                      checked={formData.hasBrandColors === opt}
                      onChange={(v) => updateField("hasBrandColors", v)}
                    />
                  ))}
                </div>
                {formData.hasBrandColors === "Yes (upload or describe)" && (
                  <div className="mt-3 space-y-3">
                    <Input
                      value={formData.brandColorDescription}
                      onChange={(e) =>
                        updateField("brandColorDescription", e.target.value)
                      }
                      placeholder="Describe your brand colors..."
                      className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25"
                    />
                    <div className="rounded-lg border border-dashed border-white/[0.12] p-4 text-center cursor-pointer hover:border-white/[0.2] transition-colors">
                      <p className="text-sm text-white/40">
                        Upload Brand Guidelines
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Content Assets & Examples */}
          {step === 4 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-white">
                Content Assets &amp; Examples
              </h3>
              <div>
                <Label className="text-white/70">
                  Upload Any Sample Photos, Videos, or Inspiration
                </Label>
                <div className="mt-2 rounded-lg border border-dashed border-white/[0.12] p-6 text-center cursor-pointer hover:border-white/[0.2] transition-colors">
                  <p className="text-sm text-white/40">
                    Click or drag files to upload
                  </p>
                </div>
              </div>
              <div>
                <Label className="text-white/70">
                  Share links to content styles you like
                </Label>
                <div className="mt-2 space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Input
                      key={i}
                      type="url"
                      value={
                        formData[
                          `referenceLink${i}` as keyof typeof formData
                        ] as string
                      }
                      onChange={(e) =>
                        updateField(`referenceLink${i}`, e.target.value)
                      }
                      placeholder={`Reference URL ${i}`}
                      className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25"
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-white/70 mb-2 block">
                  Will you be providing raw footage?
                </Label>
                <div className="space-y-2">
                  {[
                    "Yes, I will upload",
                    "Yes, you will film it",
                    "No, please create content from scratch",
                  ].map((opt) => (
                    <RadioOption
                      key={opt}
                      name="provideFootage"
                      value={opt}
                      label={opt}
                      checked={formData.provideFootage === opt}
                      onChange={(v) => updateField("provideFootage", v)}
                    />
                  ))}
                </div>
              </div>
              {formData.provideFootage === "Yes, I will upload" && (
                <div>
                  <Label className="text-white/70">
                    List file types or recording quality
                  </Label>
                  <Textarea
                    value={formData.fileTypes}
                    onChange={(e) => updateField("fileTypes", e.target.value)}
                    placeholder="e.g., MP4 1080p, iPhone footage, etc."
                    className="mt-1 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 min-h-[60px]"
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 5: Production Requirements */}
          {step === 5 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-white">
                Production Requirements
              </h3>
              <div>
                <Label className="text-white/70 mb-2 block">
                  Do you need us to film on-site?
                </Label>
                <div className="flex flex-wrap gap-4">
                  {["Yes", "No", "Maybe (need guidance)"].map((opt) => (
                    <RadioOption
                      key={opt}
                      name="needOnSiteFilming"
                      value={opt}
                      label={opt}
                      checked={formData.needOnSiteFilming === opt}
                      onChange={(v) => updateField("needOnSiteFilming", v)}
                    />
                  ))}
                </div>
              </div>
              {formData.needOnSiteFilming === "Yes" && (
                <div>
                  <Label className="text-white/70">Filming Location(s)</Label>
                  <Input
                    value={formData.filmingLocation}
                    onChange={(e) =>
                      updateField("filmingLocation", e.target.value)
                    }
                    className="mt-1 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25"
                  />
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-white/70">
                    Preferred Recording Date #1
                  </Label>
                  <Input
                    type="date"
                    value={formData.recordingDate1}
                    onChange={(e) =>
                      updateField("recordingDate1", e.target.value)
                    }
                    className="mt-1 bg-white/[0.04] border-white/[0.08] text-white"
                  />
                </div>
                <div>
                  <Label className="text-white/70">Time</Label>
                  <Input
                    type="time"
                    value={formData.recordingTime1}
                    onChange={(e) =>
                      updateField("recordingTime1", e.target.value)
                    }
                    className="mt-1 bg-white/[0.04] border-white/[0.08] text-white"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-white/70">
                    Preferred Recording Date #2
                  </Label>
                  <Input
                    type="date"
                    value={formData.recordingDate2}
                    onChange={(e) =>
                      updateField("recordingDate2", e.target.value)
                    }
                    className="mt-1 bg-white/[0.04] border-white/[0.08] text-white"
                  />
                </div>
                <div>
                  <Label className="text-white/70">Time</Label>
                  <Input
                    type="time"
                    value={formData.recordingTime2}
                    onChange={(e) =>
                      updateField("recordingTime2", e.target.value)
                    }
                    className="mt-1 bg-white/[0.04] border-white/[0.08] text-white"
                  />
                </div>
              </div>
              <div>
                <Label className="text-white/70 mb-2 block">
                  Do you need multiple angles or cameras?
                </Label>
                <div className="flex gap-6">
                  {["Yes", "No", "Not sure yet"].map((opt) => (
                    <RadioOption
                      key={opt}
                      name="multipleCameras"
                      value={opt}
                      label={opt}
                      checked={formData.multipleCameras === opt}
                      onChange={(v) => updateField("multipleCameras", v)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-white/70 mb-2 block">
                  Will your content include:
                </Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {contentIncludes.map((item) => (
                    <CheckboxOption
                      key={item}
                      label={item}
                      checked={formData.contentIncludes.includes(item)}
                      onChange={() => toggleArrayItem("contentIncludes", item)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Deliverables */}
          {step === 6 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-white">
                Deliverables
              </h3>
              <div>
                <Label className="text-white/70 mb-2 block">
                  Where will this content be published?
                </Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {publishPlatforms.map((platform) => (
                    <CheckboxOption
                      key={platform}
                      label={platform}
                      checked={formData.publishPlatforms.includes(platform)}
                      onChange={() =>
                        toggleArrayItem("publishPlatforms", platform)
                      }
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-white/70 mb-2 block">
                  How many finished pieces do you need?
                </Label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {["1", "2-3", "4-6", "7-10", "More"].map((opt) => (
                    <RadioOption
                      key={opt}
                      name="finishedPieces"
                      value={opt}
                      label={opt}
                      checked={formData.finishedPieces === opt}
                      onChange={(v) => updateField("finishedPieces", v)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-white/70 mb-2 block">
                  Preferred Aspect Ratio
                </Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    "Vertical (9:16)",
                    "Square (1:1)",
                    "Horizontal (16:9)",
                    "Unsure — choose what's best",
                  ].map((opt) => (
                    <RadioOption
                      key={opt}
                      name="aspectRatio"
                      value={opt}
                      label={opt}
                      checked={formData.aspectRatio === opt}
                      onChange={(v) => updateField("aspectRatio", v)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-white/70 mb-2 block">
                  Preferred Delivery Timeline
                </Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    "Within 72 hours",
                    "Within 1 week",
                    "Within 2 weeks",
                    "Flexible",
                    "Rush Project (extra fee)",
                  ].map((opt) => (
                    <RadioOption
                      key={opt}
                      name="deliveryTimeline"
                      value={opt}
                      label={opt}
                      checked={formData.deliveryTimeline === opt}
                      onChange={(v) => updateField("deliveryTimeline", v)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 7: Additional Services */}
          {step === 7 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-white">
                Additional Services
              </h3>
              <div>
                <Label className="text-white/70 mb-2 block">
                  Would you like us to handle posting and scheduling your
                  content?
                </Label>
                <div className="flex gap-6">
                  {["Yes", "No"].map((opt) => (
                    <RadioOption
                      key={opt}
                      name="handlePosting"
                      value={opt}
                      label={opt}
                      checked={formData.handlePosting === opt}
                      onChange={(v) => updateField("handlePosting", v)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-white/70 mb-2 block">
                  Do you want analytics tracking after posting?
                </Label>
                <div className="flex gap-6">
                  {["Yes", "No"].map((opt) => (
                    <RadioOption
                      key={opt}
                      name="analyticsTracking"
                      value={opt}
                      label={opt}
                      checked={formData.analyticsTracking === opt}
                      onChange={(v) => updateField("analyticsTracking", v)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-white/70 mb-2 block">
                  Do you need a caption written for your posts?
                </Label>
                <div className="flex gap-6">
                  {["Yes", "No"].map((opt) => (
                    <RadioOption
                      key={opt}
                      name="needCaption"
                      value={opt}
                      label={opt}
                      checked={formData.needCaption === opt}
                      onChange={(v) => updateField("needCaption", v)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 8: Budget & Approval */}
          {step === 8 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-white">
                Budget &amp; Approval
              </h3>
              <div>
                <Label className="text-white/70">
                  Estimated Budget for This Project ($)
                </Label>
                <Input
                  type="text"
                  value={formData.budget}
                  onChange={(e) => updateField("budget", e.target.value)}
                  placeholder="e.g. $300 - $1,000"
                  className="mt-1 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25"
                />
              </div>
              <div>
                <Label className="text-white/70 mb-2 block">
                  Do you need a formal quote before production begins?
                </Label>
                <div className="flex gap-6">
                  {["Yes", "No"].map((opt) => (
                    <RadioOption
                      key={opt}
                      name="needQuote"
                      value={opt}
                      label={opt}
                      checked={formData.needQuote === opt}
                      onChange={(v) => updateField("needQuote", v)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-white/70">
                  Upload Any Additional Documents or Notes
                </Label>
                <div className="mt-2 rounded-lg border border-dashed border-white/[0.12] p-6 text-center cursor-pointer hover:border-white/[0.2] transition-colors">
                  <p className="text-sm text-white/40">
                    Click or drag a file to upload
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 9: Contact Information */}
          {step === 9 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-white">
                Contact Information
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-white/70">
                    Your Name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    className="mt-1 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25"
                  />
                </div>
                <div>
                  <Label className="text-white/70">
                    Business or Brand Name
                  </Label>
                  <Input
                    value={formData.businessName}
                    onChange={(e) =>
                      updateField("businessName", e.target.value)
                    }
                    className="mt-1 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-white/70">
                    Email Address <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    className="mt-1 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25"
                  />
                </div>
                <div>
                  <Label className="text-white/70">
                    Phone Number <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    className="mt-1 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25"
                  />
                </div>
              </div>
              <div>
                <Label className="text-white/70 mb-2 block">
                  Preferred Method of Communication
                </Label>
                <div className="flex flex-wrap gap-4">
                  {["Email", "Phone", "Text", "Any"].map((opt) => (
                    <RadioOption
                      key={opt}
                      name="contactMethod"
                      value={opt}
                      label={opt}
                      checked={formData.contactMethod === opt}
                      onChange={(v) => updateField("contactMethod", v)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
            <Button
              variant="outline"
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              className="border-white/[0.12] text-white/70 hover:bg-white/[0.04] disabled:opacity-30"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            {step < TOTAL_STEPS ? (
              <Button
                onClick={() => setStep(step + 1)}
                className="bg-gradient-to-r from-[#ec4899] to-[#be185d] text-white font-semibold hover:opacity-90"
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={() => setSubmitted(true)}
                className="bg-gradient-to-r from-[#74ddc7] to-[#0d9488] text-[#0a0a0f] font-bold hover:opacity-90"
              >
                Submit Request
                <Send className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Info footer */}
      <div className="rounded-xl border border-white/[0.06] bg-[#141420] p-6 text-center">
        <p className="text-sm text-white/40">
          Carson Communications Studio · 115 Gillespie Street, Fayetteville, NC
          28301
          <br />
          (910) 484-4932 · info@wccg1045fm.com
        </p>
      </div>
    </div>
  );
}
