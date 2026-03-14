"use client";

import { useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Headphones,
  Send,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { LoginRequired } from "@/components/auth/login-required";

const TOTAL_STEPS = 7;

const voiceWorkTypes = [
  "Commercial Voice Over",
  "Documentary Narration",
  "Audiobook Narration",
  "Radio Imaging / Station IDs",
  "E-Learning or Training Module",
  "Corporate / Internal Video Narration",
  "Promotional Video Voice Over",
  "Character Voice / Creative Read",
  "Podcast Intro / Outro",
  "Other",
];

const vocalTones = [
  "Warm and Friendly",
  "Professional and Clear",
  "Energetic",
  "Calm and Relaxed",
  "Dramatic / Cinematic",
  "Conversational",
  "Humorous",
  "Deep / Strong",
  "Soft / Gentle",
  "Other",
];

const deliveryStyles = [
  "Edited and cleaned audio",
  "Fully produced with effects",
  "With background music (if provided)",
  "With background music (you choose)",
  "Multiple versions",
];

const usagePlatforms = [
  "Radio",
  "TV",
  "Social Media",
  "Website",
  "Internal Use",
  "Audiobook Platforms (Audible, etc.)",
  "E-Learning Systems",
  "Live Event",
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

export default function VoiceOverPage() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string[]>>({});
  const [formData, setFormData] = useState({
    // Step 1: Project Information
    projectTitle: "",
    voiceWorkType: "",
    // Step 2: Script & Messaging
    hasScript: "",
    scriptLength: "",
    keyWords: "",
    // Step 3: Vocal Style & Tone
    vocalTones: [] as string[],
    voiceGender: "",
    accentPreference: "",
    // Step 4: Technical Requirements
    fileFormat: "",
    deliveryStyles: [] as string[],
    timedNarration: "",
    multipleTakes: "",
    // Step 5: Usage & Deliverables
    usagePlatforms: [] as string[],
    expectedLength: "",
    deliveryDeadline: "",
    rushProject: "",
    // Step 6: Budget
    budget: "",
    needQuote: "",
    additionalNotes: "",
    // Step 7: Contact
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
      <LoginRequired fullPage message="Sign in to request voice-over and narration services. Professional voice talent for any project.">
        <div className="space-y-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-blue-950/50 to-gray-900 border border-border/30 p-10 text-center">
            <CheckCircle2 className="h-16 w-16 text-[#74ddc7] mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-3">
              Request Submitted!
            </h1>
            <p className="text-white/60 max-w-md mx-auto mb-6">
              Thank you for your voice over and narration request. Our production
              team will review your submission and contact you within 1-2 business
              days.
            </p>
            <Button
              asChild
              className="rounded-full bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] text-white font-semibold px-6"
            >
              <Link href="/studio">Back to Studios</Link>
            </Button>
          </div>
        </div>
      </LoginRequired>
    );
  }

  return (
    <LoginRequired fullPage message="Sign in to request voice-over and narration services. Professional voice talent for any project.">
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-blue-950/50 to-gray-900 border border-border/30">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, rgba(59,130,246,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 30%, rgba(116,221,199,0.2) 0%, transparent 50%)`,
            }}
          />
        </div>
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8] shadow-xl shadow-blue-500/20">
              <Headphones className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-2">
                Voice Over &amp; Narration
              </h1>
              <p className="text-base text-muted-foreground max-w-2xl">
                Professional voice over and narration services that bring your
                content to life. Whether you&apos;re creating a commercial,
                documentary, audiobook, e-learning module, or branded content,
                our team delivers clean, high-quality recordings.
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
            "Your script or a working draft",
            "A description of the tone, style, or delivery you want",
            "Any reference audio or examples to follow",
            "Branding materials or project context (if available)",
            "Your preferred deadline and final file format",
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
              className="h-full bg-gradient-to-r from-[#3b82f6] to-[#74ddc7] rounded-full transition-all duration-500"
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
                  Project Title or Working Title
                </Label>
                <Input
                  value={formData.projectTitle}
                  onChange={(e) => updateField("projectTitle", e.target.value)}
                  className="mt-1 bg-foreground/[0.04] border-border text-foreground placeholder:text-muted-foreground/60"
                />
              </div>
              <div>
                <Label className="text-foreground/70">
                  Type of Voice Work Needed
                </Label>
                <select
                  value={formData.voiceWorkType}
                  onChange={(e) => updateField("voiceWorkType", e.target.value)}
                  className="mt-1 w-full rounded-md bg-foreground/[0.04] border border-border text-foreground/70 px-3 py-2 text-sm"
                >
                  <option value="" className="bg-card">
                    Select type...
                  </option>
                  {voiceWorkTypes.map((type) => (
                    <option key={type} value={type} className="bg-card">
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Script & Messaging */}
          {step === 2 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-foreground">
                Script &amp; Messaging
              </h3>
              <div>
                <Label className="text-foreground/70 mb-2 block">
                  Do you have a script ready?
                </Label>
                <div className="space-y-2">
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
                    Upload Script or Draft
                  </Label>
                  <div
                    onClick={() => document.getElementById('upload-vo-script')?.click()}
                    className="mt-2 rounded-lg border-2 border-dashed border-border p-6 text-center cursor-pointer hover:border-[#74ddc7]/50 hover:bg-[#74ddc7]/5 transition-colors"
                  >
                    <input
                      id="upload-vo-script"
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length > 0) {
                          setUploadedFiles(prev => ({
                            ...prev,
                            script: files.map(f => f.name)
                          }));
                        }
                      }}
                    />
                    {uploadedFiles.script?.length ? (
                      <div className="space-y-1">
                        {uploadedFiles.script.map((name, i) => (
                          <p key={i} className="text-xs text-[#74ddc7] font-medium">{name}</p>
                        ))}
                        <p className="text-[10px] text-muted-foreground mt-1">Click to change files</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                        <p className="text-sm text-muted-foreground">Click to upload or drag files here</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">Documents (PDF, DOC, TXT)</p>
                      </>
                    )}
                  </div>
                </div>
              )}
              <div>
                <Label className="text-foreground/70 mb-2 block">
                  Estimated Script Length
                </Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    "Under 30 seconds",
                    "30-60 seconds",
                    "1-3 minutes",
                    "3-10 minutes",
                    "10+ minutes",
                    "Full audiobook or long-form project",
                  ].map((opt) => (
                    <RadioOption
                      key={opt}
                      name="scriptLength"
                      value={opt}
                      label={opt}
                      checked={formData.scriptLength === opt}
                      onChange={(v) => updateField("scriptLength", v)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-foreground/70">
                  Key Words or Phrases to Emphasize
                </Label>
                <Textarea
                  value={formData.keyWords}
                  onChange={(e) => updateField("keyWords", e.target.value)}
                  placeholder="List any words or phrases that should be emphasized..."
                  className="mt-1 bg-foreground/[0.04] border-border text-foreground placeholder:text-muted-foreground/60 min-h-[80px]"
                />
              </div>
            </div>
          )}

          {/* Step 3: Vocal Style & Tone */}
          {step === 3 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-foreground">
                Vocal Style &amp; Tone
              </h3>
              <div>
                <Label className="text-foreground/70 mb-2 block">
                  Preferred Vocal Tone
                </Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {vocalTones.map((tone) => (
                    <CheckboxOption
                      key={tone}
                      label={tone}
                      checked={formData.vocalTones.includes(tone)}
                      onChange={() => toggleArrayItem("vocalTones", tone)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-foreground/70 mb-2 block">
                  Voice Gender Preference
                </Label>
                <div className="flex gap-6">
                  {["Male", "Female", "Any"].map((opt) => (
                    <RadioOption
                      key={opt}
                      name="voiceGender"
                      value={opt}
                      label={opt}
                      checked={formData.voiceGender === opt}
                      onChange={(v) => updateField("voiceGender", v)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-foreground/70 mb-2 block">
                  Accent or Delivery Preference
                </Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    "Standard American English",
                    "Southern",
                    "Urban / Contemporary",
                    "Neutral Global English",
                    "Caribbean",
                    "Other",
                  ].map((opt) => (
                    <RadioOption
                      key={opt}
                      name="accentPreference"
                      value={opt}
                      label={opt}
                      checked={formData.accentPreference === opt}
                      onChange={(v) => updateField("accentPreference", v)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-foreground/70">
                  Upload Reference Audio (optional)
                </Label>
                <div
                  onClick={() => document.getElementById('upload-vo-reference')?.click()}
                  className="mt-2 rounded-lg border-2 border-dashed border-border p-6 text-center cursor-pointer hover:border-[#74ddc7]/50 hover:bg-[#74ddc7]/5 transition-colors"
                >
                  <input
                    id="upload-vo-reference"
                    type="file"
                    accept="audio/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length > 0) {
                        setUploadedFiles(prev => ({
                          ...prev,
                          referenceAudio: files.map(f => f.name)
                        }));
                      }
                    }}
                  />
                  {uploadedFiles.referenceAudio?.length ? (
                    <div className="space-y-1">
                      {uploadedFiles.referenceAudio.map((name, i) => (
                        <p key={i} className="text-xs text-[#74ddc7] font-medium">{name}</p>
                      ))}
                      <p className="text-[10px] text-muted-foreground mt-1">Click to change files</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="text-sm text-muted-foreground">Click to upload or drag files here</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">Audio files (MP3, WAV, AIFF)</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Technical Requirements */}
          {step === 4 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-foreground">
                Technical Requirements
              </h3>
              <div>
                <Label className="text-foreground/70 mb-2 block">
                  Preferred File Format
                </Label>
                <div className="flex flex-wrap gap-4">
                  {["MP3", "WAV", "AIFF", "Multiple formats", "Not sure"].map(
                    (opt) => (
                      <RadioOption
                        key={opt}
                        name="fileFormat"
                        value={opt}
                        label={opt}
                        checked={formData.fileFormat === opt}
                        onChange={(v) => updateField("fileFormat", v)}
                      />
                    )
                  )}
                </div>
              </div>
              <div>
                <Label className="text-foreground/70 mb-2 block">
                  Delivery Style
                </Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {deliveryStyles.map((style) => (
                    <CheckboxOption
                      key={style}
                      label={style}
                      checked={formData.deliveryStyles.includes(style)}
                      onChange={() => toggleArrayItem("deliveryStyles", style)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-foreground/70 mb-2 block">
                  Do you require timed narration (matching video or visual
                  cues)?
                </Label>
                <div className="flex gap-6">
                  {["Yes", "No", "Not sure"].map((opt) => (
                    <RadioOption
                      key={opt}
                      name="timedNarration"
                      value={opt}
                      label={opt}
                      checked={formData.timedNarration === opt}
                      onChange={(v) => updateField("timedNarration", v)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-foreground/70 mb-2 block">
                  Do you need multiple takes?
                </Label>
                <div className="flex gap-6">
                  {["Yes", "No"].map((opt) => (
                    <RadioOption
                      key={opt}
                      name="multipleTakes"
                      value={opt}
                      label={opt}
                      checked={formData.multipleTakes === opt}
                      onChange={(v) => updateField("multipleTakes", v)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Usage & Deliverables */}
          {step === 5 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-foreground">
                Usage &amp; Deliverables
              </h3>
              <div>
                <Label className="text-foreground/70 mb-2 block">
                  Where will this voiceover be used?
                </Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {usagePlatforms.map((platform) => (
                    <CheckboxOption
                      key={platform}
                      label={platform}
                      checked={formData.usagePlatforms.includes(platform)}
                      onChange={() =>
                        toggleArrayItem("usagePlatforms", platform)
                      }
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-foreground/70">
                  Expected Length of Final Audio (minutes)
                </Label>
                <Input
                  value={formData.expectedLength}
                  onChange={(e) =>
                    updateField("expectedLength", e.target.value)
                  }
                  placeholder="e.g., 2 minutes"
                  className="mt-1 bg-foreground/[0.04] border-border text-foreground placeholder:text-muted-foreground/60 max-w-[200px]"
                />
              </div>
              <div>
                <Label className="text-foreground/70">Delivery Deadline</Label>
                <Input
                  type="date"
                  value={formData.deliveryDeadline}
                  onChange={(e) =>
                    updateField("deliveryDeadline", e.target.value)
                  }
                  className="mt-1 bg-foreground/[0.04] border-border text-foreground max-w-[200px]"
                />
              </div>
              <div>
                <Label className="text-foreground/70 mb-2 block">
                  Rush Project?
                </Label>
                <div className="flex gap-6">
                  {["Yes", "No"].map((opt) => (
                    <RadioOption
                      key={opt}
                      name="rushProject"
                      value={opt}
                      label={opt}
                      checked={formData.rushProject === opt}
                      onChange={(v) => updateField("rushProject", v)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Budget & Additional Details */}
          {step === 6 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-foreground">
                Budget &amp; Additional Details
              </h3>
              <div>
                <Label className="text-foreground/70">Estimated Budget ($)</Label>
                <Input
                  type="text"
                  value={formData.budget}
                  onChange={(e) => updateField("budget", e.target.value)}
                  placeholder="e.g. $150 - $500"
                  className="mt-1 bg-foreground/[0.04] border-border text-foreground placeholder:text-muted-foreground/60"
                />
              </div>
              <div>
                <Label className="text-foreground/70 mb-2 block">
                  Do you need a formal quote before recording begins?
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
                  Additional Notes or Special Instructions
                </Label>
                <Textarea
                  value={formData.additionalNotes}
                  onChange={(e) =>
                    updateField("additionalNotes", e.target.value)
                  }
                  placeholder="Any additional details about your project..."
                  className="mt-1 bg-foreground/[0.04] border-border text-foreground placeholder:text-muted-foreground/60 min-h-[100px]"
                />
              </div>
            </div>
          )}

          {/* Step 7: Contact Information */}
          {step === 7 && (
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
                    Business or Organization
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
                className="bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] text-white font-semibold hover:opacity-90"
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={() => {
                  if (!formData.name.trim() || !formData.email.trim()) {
                    alert("Please fill in your name and email before submitting.");
                    return;
                  }
                  const submission = { ...formData, uploadedFileNames: uploadedFiles, submittedAt: new Date().toISOString(), type: 'voice-over' };
                  const existing = JSON.parse(localStorage.getItem('wccg-submissions') || '[]');
                  existing.push(submission);
                  localStorage.setItem('wccg-submissions', JSON.stringify(existing));
                  setSubmitted(true);
                }}
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
    </LoginRequired>
  );
}
