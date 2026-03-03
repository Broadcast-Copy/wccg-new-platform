"use client";

import { useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Video,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

const TOTAL_STEPS = 9;

const videoTypes = [
  "Commercial / Advertisement",
  "Promotional Video",
  "Documentary or Short Feature",
  "Interview or Conversation Series",
  "Corporate or Training Video",
  "Event Recap Video",
  "Music Video",
  "Social Media Video (Short-Form)",
  "Testimonial or Storytelling Video",
  "Product Demo",
  "Real Estate or Property Video",
  "Drone Footage",
  "Other",
];

const intendedUse = [
  "Social Media",
  "Website / Landing Page",
  "Broadcast TV",
  "In-House / Corporate Training",
  "Event or Presentation",
  "Advertising Campaign",
  "Other",
];

const mainGoals = [
  "Brand Awareness",
  "Product Promotion",
  "Education / Instruction",
  "Emotional Storytelling",
  "Engagement & Reach",
  "Recruitment",
  "Fundraising",
  "Event Promotion",
  "Other",
];

const toneStyles = [
  "Professional",
  "High Energy",
  "Cinematic",
  "Inspirational",
  "Corporate",
  "Urban / Trendy",
  "Documentary Style",
  "Humorous",
  "Minimalist / Clean",
  "Emotional",
  "Other",
];

const cameraReqs = [
  "Single Camera",
  "Multi-Camera Setup",
  "4K Video",
  "Slow Motion",
  "Stabilized / Gimbal Shots",
  "Aerial Drone Footage",
  "Lighting Kit Needed",
  "Audio / Lav Mics Needed",
  "Teleprompter",
  "Other",
];

const editingReqs = [
  "Standard Editing",
  "Color Grading",
  "Motion Graphics",
  "Text Overlays",
  "Subtitles / Captions",
  "Sound Design",
  "Green Screen Editing",
  "Multi-Cam Sync",
  "Trailer or Teaser Creation",
  "Social Media Cutdowns",
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
            : "border-white/30 group-hover:border-foreground/50"
        }`}
        onClick={() => onChange(value)}
      >
        {checked && <div className="w-2 h-2 rounded-full bg-background" />}
      </div>
      <span
        className="text-sm text-foreground/70 group-hover:text-foreground/90"
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
            : "border-white/30 group-hover:border-foreground/50"
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
      <span className="text-sm text-foreground/70 group-hover:text-foreground/90">
        {label}
      </span>
    </label>
  );
}

export default function VideoProductionPage() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    // Step 1
    videoType: "",
    videoTypeOther: "",
    projectDescription: "",
    intendedUse: [] as string[],
    // Step 2
    mainGoal: "",
    targetAudience: "",
    toneStyle: [] as string[],
    referenceLink1: "",
    referenceLink2: "",
    referenceLink3: "",
    // Step 3
    hasScript: "",
    keyMessages: "",
    needVoiceover: "",
    // Step 4
    provideTalent: "",
    peopleOnCamera: "",
    needCoaching: "",
    includeInterviews: "",
    // Step 5
    requireOnSite: "",
    indoorOutdoor: "",
    requireDrone: "",
    filmingDate: "",
    backupDate: "",
    filmingDuration: "",
    // Step 6
    cameraRequirements: [] as string[],
    editingRequirements: [] as string[],
    // Step 7
    videoLength: "",
    aspectRatio: "",
    totalVideos: "",
    deliveryTimeline: "",
    // Step 8
    budget: "",
    needQuote: "",
    additionalNotes: "",
    // Step 9
    name: "",
    business: "",
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
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-amber-950/50 to-gray-900 border border-border/30 p-10 text-center">
          <CheckCircle2 className="h-16 w-16 text-[#74ddc7] mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-3">
            Request Submitted!
          </h1>
          <p className="text-white/60 max-w-md mx-auto mb-6">
            Thank you for your video production request. Our team will review
            your submission and contact you within 1-2 business days to discuss
            your project.
          </p>
          <Button
            asChild
            className="rounded-full bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-white font-semibold px-6"
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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-amber-950/50 to-gray-900 border border-border/30">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, rgba(245,158,11,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 30%, rgba(116,221,199,0.2) 0%, transparent 50%)`,
            }}
          />
        </div>
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f59e0b] to-[#d97706] shadow-xl shadow-amber-500/20">
              <Video className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-2">
                Video Production
              </h1>
              <p className="text-base text-muted-foreground max-w-2xl">
                Professional video production that brings your vision to life.
                Your message deserves to be seen — let us help you turn it into
                powerful visual storytelling.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pre-form info */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-3">
          Before You Begin
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Please have the following ready before completing this form:
        </p>
        <ul className="space-y-2">
          {[
            "Your project title or working title",
            "A short description of your concept, goals, or storyline",
            "Any branding assets, logos, or visual references",
            "Sample footage or inspiration you'd like us to consider",
            "Your preferred production dates and estimated release timeline",
          ].map((item) => (
            <li
              key={item}
              className="flex items-center gap-2 text-sm text-foreground/60"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-[#74ddc7] shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Form */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Progress bar */}
        <div className="border-b border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Step {step} of {TOTAL_STEPS}
            </span>
            <span className="text-xs font-bold text-[#74ddc7]">
              {progress}%
            </span>
          </div>
          <div className="h-2 bg-foreground/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#f59e0b] to-[#74ddc7] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Step 1: Project Information */}
          {step === 1 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-foreground">
                Project Information
              </h3>
              <div>
                <Label className="text-foreground/70">
                  Type of Video Requested
                </Label>
                <select
                  value={formData.videoType}
                  onChange={(e) => updateField("videoType", e.target.value)}
                  className="mt-1 w-full rounded-md bg-foreground/[0.04] border border-border text-foreground/70 px-3 py-2 text-sm"
                >
                  <option value="" className="bg-card">
                    Select video type...
                  </option>
                  {videoTypes.map((type) => (
                    <option key={type} value={type} className="bg-card">
                      {type}
                    </option>
                  ))}
                </select>
                {formData.videoType === "Other" && (
                  <Input
                    value={formData.videoTypeOther}
                    onChange={(e) =>
                      updateField("videoTypeOther", e.target.value)
                    }
                    placeholder="Please specify..."
                    className="mt-3 bg-foreground/[0.04] border-border text-foreground placeholder:text-muted-foreground/60"
                  />
                )}
              </div>
              <div>
                <Label className="text-foreground/70">Project Description</Label>
                <Textarea
                  value={formData.projectDescription}
                  onChange={(e) =>
                    updateField("projectDescription", e.target.value)
                  }
                  placeholder="Describe the purpose, concept, storyline, and overall vision."
                  className="mt-1 bg-foreground/[0.04] border-border text-foreground placeholder:text-muted-foreground/60 min-h-[100px]"
                />
              </div>
              <div>
                <Label className="text-foreground/70 mb-2 block">
                  Intended Use of the Video
                </Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {intendedUse.map((use) => (
                    <CheckboxOption
                      key={use}
                      label={use}
                      checked={formData.intendedUse.includes(use)}
                      onChange={() => toggleArrayItem("intendedUse", use)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Goals & Creative Direction */}
          {step === 2 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-foreground">
                Goals &amp; Creative Direction
              </h3>
              <div>
                <Label className="text-foreground/70">
                  Main Goal of This Video
                </Label>
                <select
                  value={formData.mainGoal}
                  onChange={(e) => updateField("mainGoal", e.target.value)}
                  className="mt-1 w-full rounded-md bg-foreground/[0.04] border border-border text-foreground/70 px-3 py-2 text-sm"
                >
                  <option value="" className="bg-card">
                    Select main goal...
                  </option>
                  {mainGoals.map((goal) => (
                    <option key={goal} value={goal} className="bg-card">
                      {goal}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-foreground/70">Target Audience</Label>
                <Input
                  value={formData.targetAudience}
                  onChange={(e) =>
                    updateField("targetAudience", e.target.value)
                  }
                  placeholder="Describe your target audience..."
                  className="mt-1 bg-foreground/[0.04] border-border text-foreground placeholder:text-muted-foreground/60"
                />
              </div>
              <div>
                <Label className="text-foreground/70 mb-2 block">
                  Preferred Tone or Style
                </Label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {toneStyles.map((style) => (
                    <CheckboxOption
                      key={style}
                      label={style}
                      checked={formData.toneStyle.includes(style)}
                      onChange={() => toggleArrayItem("toneStyle", style)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-foreground/70">
                  Share Links to Videos That Inspire Your Project
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
                      className="bg-foreground/[0.04] border-border text-foreground placeholder:text-muted-foreground/60"
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Script & Messaging */}
          {step === 3 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-foreground">
                Script &amp; Messaging
              </h3>
              <div>
                <Label className="text-foreground/70 mb-2 block">
                  Do you have a script prepared?
                </Label>
                <div className="flex flex-wrap gap-4">
                  {[
                    "Yes (upload below)",
                    "No",
                    "I need help writing it",
                  ].map((opt) => (
                    <RadioOption
                      key={opt}
                      name="hasScript"
                      value={opt}
                      label={opt}
                      checked={formData.hasScript === opt}
                      onChange={(v) => updateField("hasScript", v)}
                    />
                  ))}
                </div>
              </div>
              {formData.hasScript === "Yes (upload below)" && (
                <div>
                  <Label className="text-foreground/70">
                    Upload Script or Outline
                  </Label>
                  <div className="mt-2 rounded-lg border border-dashed border-input p-6 text-center cursor-pointer hover:border-foreground/20 transition-colors">
                    <p className="text-sm text-muted-foreground">
                      Click or drag a file to upload
                    </p>
                  </div>
                </div>
              )}
              <div>
                <Label className="text-foreground/70">
                  Key Messages or Talking Points
                </Label>
                <Textarea
                  value={formData.keyMessages}
                  onChange={(e) => updateField("keyMessages", e.target.value)}
                  placeholder="What are the key messages you want to convey?"
                  className="mt-1 bg-foreground/[0.04] border-border text-foreground placeholder:text-muted-foreground/60 min-h-[100px]"
                />
              </div>
              <div>
                <Label className="text-foreground/70 mb-2 block">
                  Will you need voiceover narration?
                </Label>
                <div className="flex gap-6">
                  {["Yes", "No", "Not sure yet"].map((opt) => (
                    <RadioOption
                      key={opt}
                      name="needVoiceover"
                      value={opt}
                      label={opt}
                      checked={formData.needVoiceover === opt}
                      onChange={(v) => updateField("needVoiceover", v)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Talent & On-Screen Requirements */}
          {step === 4 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-foreground">
                Talent &amp; On-Screen Requirements
              </h3>
              <div>
                <Label className="text-foreground/70 mb-2 block">
                  Will you provide on-camera talent?
                </Label>
                <div className="flex flex-wrap gap-4">
                  {[
                    "Yes",
                    "No",
                    "Need assistance finding talent",
                  ].map((opt) => (
                    <RadioOption
                      key={opt}
                      name="provideTalent"
                      value={opt}
                      label={opt}
                      checked={formData.provideTalent === opt}
                      onChange={(v) => updateField("provideTalent", v)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-foreground/70">
                  How many people will appear on camera?
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.peopleOnCamera}
                  onChange={(e) =>
                    updateField("peopleOnCamera", e.target.value)
                  }
                  placeholder="Number of people"
                  className="mt-1 bg-foreground/[0.04] border-border text-foreground placeholder:text-muted-foreground/60 max-w-[200px]"
                />
              </div>
              <div>
                <Label className="text-foreground/70 mb-2 block">
                  Need coaching or script guidance for talent?
                </Label>
                <div className="flex gap-6">
                  {["Yes", "No"].map((opt) => (
                    <RadioOption
                      key={opt}
                      name="needCoaching"
                      value={opt}
                      label={opt}
                      checked={formData.needCoaching === opt}
                      onChange={(v) => updateField("needCoaching", v)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-foreground/70 mb-2 block">
                  Will your video include interviews?
                </Label>
                <div className="flex gap-6">
                  {["Yes", "No"].map((opt) => (
                    <RadioOption
                      key={opt}
                      name="includeInterviews"
                      value={opt}
                      label={opt}
                      checked={formData.includeInterviews === opt}
                      onChange={(v) => updateField("includeInterviews", v)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Production Details */}
          {step === 5 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-foreground">
                Production Details
              </h3>
              <div>
                <Label className="text-foreground/70 mb-2 block">
                  Require on-site filming?
                </Label>
                <div className="flex gap-6">
                  {["Yes", "No"].map((opt) => (
                    <RadioOption
                      key={opt}
                      name="requireOnSite"
                      value={opt}
                      label={opt}
                      checked={formData.requireOnSite === opt}
                      onChange={(v) => updateField("requireOnSite", v)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-foreground/70 mb-2 block">
                  Indoor or outdoor shots?
                </Label>
                <div className="flex flex-wrap gap-4">
                  {["Indoor", "Outdoor", "Both"].map((opt) => (
                    <RadioOption
                      key={opt}
                      name="indoorOutdoor"
                      value={opt}
                      label={opt}
                      checked={formData.indoorOutdoor === opt}
                      onChange={(v) => updateField("indoorOutdoor", v)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-foreground/70 mb-2 block">
                  Require drone footage?
                </Label>
                <div className="flex gap-6">
                  {["Yes", "No", "Maybe"].map((opt) => (
                    <RadioOption
                      key={opt}
                      name="requireDrone"
                      value={opt}
                      label={opt}
                      checked={formData.requireDrone === opt}
                      onChange={(v) => updateField("requireDrone", v)}
                    />
                  ))}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-foreground/70">
                    Preferred Filming Date
                  </Label>
                  <Input
                    type="date"
                    value={formData.filmingDate}
                    onChange={(e) => updateField("filmingDate", e.target.value)}
                    className="mt-1 bg-foreground/[0.04] border-border text-foreground"
                  />
                </div>
                <div>
                  <Label className="text-foreground/70">Backup Date</Label>
                  <Input
                    type="date"
                    value={formData.backupDate}
                    onChange={(e) => updateField("backupDate", e.target.value)}
                    className="mt-1 bg-foreground/[0.04] border-border text-foreground"
                  />
                </div>
              </div>
              <div>
                <Label className="text-foreground/70">
                  Estimated Duration of Filming
                </Label>
                <select
                  value={formData.filmingDuration}
                  onChange={(e) =>
                    updateField("filmingDuration", e.target.value)
                  }
                  className="mt-1 w-full rounded-md bg-foreground/[0.04] border border-border text-foreground/70 px-3 py-2 text-sm"
                >
                  <option value="" className="bg-card">
                    Select duration...
                  </option>
                  {[
                    "1 hour",
                    "2-3 hours",
                    "Half-day (4 hours)",
                    "Full day (8 hours)",
                    "Multi-day shoot",
                  ].map((opt) => (
                    <option key={opt} value={opt} className="bg-card">
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Step 6: Technical Needs */}
          {step === 6 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-foreground">
                Technical Needs
              </h3>
              <div>
                <Label className="text-foreground/70 mb-2 block">
                  Camera Requirements
                </Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {cameraReqs.map((req) => (
                    <CheckboxOption
                      key={req}
                      label={req}
                      checked={formData.cameraRequirements.includes(req)}
                      onChange={() =>
                        toggleArrayItem("cameraRequirements", req)
                      }
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-foreground/70 mb-2 block">
                  Editing Requirements
                </Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {editingReqs.map((req) => (
                    <CheckboxOption
                      key={req}
                      label={req}
                      checked={formData.editingRequirements.includes(req)}
                      onChange={() =>
                        toggleArrayItem("editingRequirements", req)
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 7: Deliverables */}
          {step === 7 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-foreground">
                Deliverables
              </h3>
              <div>
                <Label className="text-foreground/70">Finished Video Length</Label>
                <select
                  value={formData.videoLength}
                  onChange={(e) => updateField("videoLength", e.target.value)}
                  className="mt-1 w-full rounded-md bg-foreground/[0.04] border border-border text-foreground/70 px-3 py-2 text-sm"
                >
                  <option value="" className="bg-card">
                    Select length...
                  </option>
                  {[
                    "Under 30 seconds",
                    "30-60 seconds",
                    "1-3 minutes",
                    "3-5 minutes",
                    "5-10 minutes",
                    "10+ minutes",
                    "Multiple versions",
                  ].map((opt) => (
                    <option key={opt} value={opt} className="bg-card">
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-foreground/70 mb-2 block">
                  Aspect Ratio
                </Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    "16:9 Horizontal",
                    "9:16 Vertical",
                    "1:1 Square",
                    "Multiple Formats",
                    "Not sure",
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
                <Label className="text-foreground/70">
                  How many final videos needed?
                </Label>
                <select
                  value={formData.totalVideos}
                  onChange={(e) => updateField("totalVideos", e.target.value)}
                  className="mt-1 w-full rounded-md bg-foreground/[0.04] border border-border text-foreground/70 px-3 py-2 text-sm"
                >
                  <option value="" className="bg-card">
                    Select quantity...
                  </option>
                  {["1", "2-3", "4-6", "7-10", "More"].map((opt) => (
                    <option key={opt} value={opt} className="bg-card">
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-foreground/70 mb-2 block">
                  Delivery Timeline
                </Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    "Within 72 hours (Rush Project)",
                    "Within 1 week",
                    "Within 2 weeks",
                    "Within 30 days",
                    "Flexible",
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

          {/* Step 8: Budget & Approval */}
          {step === 8 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-foreground">
                Budget &amp; Approval
              </h3>
              <div>
                <Label className="text-foreground/70">Estimated Budget ($)</Label>
                <Input
                  type="text"
                  value={formData.budget}
                  onChange={(e) => updateField("budget", e.target.value)}
                  placeholder="e.g. $500 - $2,000"
                  className="mt-1 bg-foreground/[0.04] border-border text-foreground placeholder:text-muted-foreground/60"
                />
              </div>
              <div>
                <Label className="text-foreground/70 mb-2 block">
                  Need formal quote before production?
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
                <Label className="text-foreground/70">
                  Additional Notes or Special Requests
                </Label>
                <Textarea
                  value={formData.additionalNotes}
                  onChange={(e) =>
                    updateField("additionalNotes", e.target.value)
                  }
                  placeholder="Any additional information..."
                  className="mt-1 bg-foreground/[0.04] border-border text-foreground placeholder:text-muted-foreground/60 min-h-[100px]"
                />
              </div>
            </div>
          )}

          {/* Step 9: Contact Information */}
          {step === 9 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-foreground">
                Contact Information
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-foreground/70">
                    Your Name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    className="mt-1 bg-foreground/[0.04] border-border text-foreground placeholder:text-muted-foreground/60"
                  />
                </div>
                <div>
                  <Label className="text-foreground/70">
                    Business / Organization
                  </Label>
                  <Input
                    value={formData.business}
                    onChange={(e) => updateField("business", e.target.value)}
                    className="mt-1 bg-foreground/[0.04] border-border text-foreground placeholder:text-muted-foreground/60"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-foreground/70">
                    Email Address <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    className="mt-1 bg-foreground/[0.04] border-border text-foreground placeholder:text-muted-foreground/60"
                  />
                </div>
                <div>
                  <Label className="text-foreground/70">
                    Phone Number <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    className="mt-1 bg-foreground/[0.04] border-border text-foreground placeholder:text-muted-foreground/60"
                  />
                </div>
              </div>
              <div>
                <Label className="text-foreground/70 mb-2 block">
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
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              className="border-input text-foreground/70 hover:bg-foreground/[0.04] disabled:opacity-30"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            {step < TOTAL_STEPS ? (
              <Button
                onClick={() => setStep(step + 1)}
                className="bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-white font-semibold hover:opacity-90"
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
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Carson Communications Studio · 115 Gillespie Street, Fayetteville, NC
          28301
          <br />
          (910) 484-4932 · info@wccg1045fm.com
        </p>
      </div>
    </div>
  );
}
