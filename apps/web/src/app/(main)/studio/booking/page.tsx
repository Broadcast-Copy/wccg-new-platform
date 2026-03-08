"use client";

import { useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clapperboard,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { LoginRequired } from "@/components/auth/login-required";

const TOTAL_STEPS = 8;

const studioOptions = [
  {
    value: "production",
    label: "Production Studio",
    description:
      "Dual monitors, HD webcam, Adobe Suite, OBS, broadcast mics, Yamaha HS4 monitors, standing desk, auxiliary inputs, guest mics, multi-phone inputs, branding monitor.",
  },
  {
    value: "on-air",
    label: "On-Air Studio",
    description:
      "Quad monitors, HD webcam, Adobe Suite, DJB Radio software, OBS, broadcast mics, Yamaha HS4 monitors, standing desk, auxiliary inputs, guest mics, multi-phone inputs, branding monitor.",
  },
  {
    value: "gaming",
    label: "Gaming / Reaction Studio",
    description:
      "Tri-monitor setup with curved screens, HD webcam, Adobe Suite, gaming capture card, OBS, broadcast mic, green screen, expansion options, standing desk.",
  },
  {
    value: "expansion",
    label: "Expansion Studio",
    description:
      "Add-on studio to the On-Air or Production Studio with host mic, guest mics, auxiliary inputs, standing desk option. (Must be booked with the On-Air or Production Studio.)",
  },
  {
    value: "public-facing",
    label: "Public Facing Studio (Window Studio)",
    description:
      "Broadcast live from downtown Fayetteville with audience visibility, lavalier mics, branding monitor, dual monitor production setup.",
  },
  {
    value: "conference",
    label: "Conference Studio",
    description:
      "Host mic, up to 4 guest mics, auxiliary inputs, large conference table, branding monitor — ideal for panels and roundtables.",
  },
];

const bookingTypes = [
  "Podcast Recording",
  "Live Broadcast",
  "Live Stream",
  "Gaming / Reaction Content",
  "Interview or Panel",
  "Music or Instrument Recording",
  "Video Production or Filming",
  "Radio Imaging or Voice Work",
  "Other",
];

const totalTimeOptions = [
  "1 hour",
  "2 hours",
  "3-4 hours",
  "Half Day (4 hours)",
  "Full Day (8 hours)",
  "Multi-Day Booking",
];

const softwareOptions = [
  "OBS for Recording",
  "Adobe Creative Software",
  "DJB Radio Software (On-Air Studio only)",
  "Gaming Capture (Gaming/Reaction Studio only)",
  "Lavalier Mics (Public Facing Studio only)",
  "Green Screen (Gaming/Reaction Studio only)",
  "Branding Monitor",
  "Multi-Telephone Input (Hardline/Bluetooth)",
];

const addOnOptions = [
  "Camera Operator",
  "Audio Engineer",
  "Producer / Show Runner",
  "Live Stream Setup",
  "Post-Production Editing",
  "Graphic Overlays or Branding",
  "Social Media Clips / Reels",
  "Green Screen Keying & Effects (Gaming Studio only)",
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
      >
        {checked && <div className="w-2 h-2 rounded-full bg-background" />}
      </div>
      <span className="text-sm text-foreground/70 group-hover:text-foreground/90">
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

export default function StudioBookingPage() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    // Step 1: Contact
    fullName: "",
    business: "",
    email: "",
    phone: "",
    contactMethod: "",
    // Step 2: Studio
    studio: "",
    // Step 3: Booking Details
    bookingType: "",
    bookingTypeOther: "",
    preferredDate: "",
    backupDate: "",
    startTime: "",
    endTime: "",
    totalTime: "",
    // Step 4: Technical Needs
    needHostMic: "",
    guestMics: "",
    auxiliaryInputs: "",
    software: [] as string[],
    specialTechnical: "",
    // Step 5: Content Details
    contentType: "",
    bringEquipment: "",
    bringEquipmentDetails: "",
    setupAssistance: "",
    needEngineer: "",
    // Step 6: Add-Ons
    addOns: [] as string[],
    // Step 7: Additional Info
    additionalDetails: "",
    // Step 8: Budget
    budget: "",
    needInvoice: "",
    paymentMethod: "",
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

  const handleSubmit = () => {
    if (!formData.fullName.trim() || !formData.email.trim()) {
      alert("Please fill in your name and email before submitting.");
      return;
    }

    const submission = {
      ...formData,
      submittedAt: new Date().toISOString(),
      type: "studio-booking",
    };
    const existing = JSON.parse(
      localStorage.getItem("wccg-submissions") || "[]"
    );
    existing.push(submission);
    localStorage.setItem("wccg-submissions", JSON.stringify(existing));

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <LoginRequired
        fullPage
        message="Sign in to book a studio session. Browse studios, select your preferred space, and submit a booking request."
      >
        <div className="space-y-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-purple-950/50 to-gray-900 border border-border/30 p-10 text-center">
            <CheckCircle2 className="h-16 w-16 text-[#74ddc7] mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-3">
              Request Submitted!
            </h1>
            <p className="text-white/60 max-w-md mx-auto mb-6">
              Thank you for your studio booking request. Our production team will
              review your submission and contact you within 1-2 business days to
              confirm your booking.
            </p>
            <Button
              asChild
              className="rounded-full bg-gradient-to-r from-[#7401df] to-[#4c1d95] text-white font-semibold px-6"
            >
              <Link href="/studio">Back to Studios</Link>
            </Button>
          </div>
        </div>
      </LoginRequired>
    );
  }

  return (
    <LoginRequired
      fullPage
      message="Sign in to book a studio session. Browse studios, select your preferred space, and submit a booking request."
    >
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-purple-950/50 to-gray-900 border border-border/30">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, rgba(116,1,223,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 30%, rgba(116,221,199,0.2) 0%, transparent 50%)`,
            }}
          />
        </div>
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7401df] to-[#4c1d95] shadow-xl shadow-purple-500/20">
              <Clapperboard className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-2">
                Studio Booking Request
              </h1>
              <p className="text-base text-muted-foreground max-w-2xl">
                Welcome to the Carson Communications Studio Booking Portal,
                where high-quality production meets flexibility and comfort.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pre-form info */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-3">
          Book Your Studio and Start Creating
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Please have the following ready before completing this form:
        </p>
        <ul className="space-y-2">
          {[
            "Studio selection",
            "Content description",
            "Branding materials, scripts, or reference files",
            "Additional equipment details",
            "Preferred date, time, and session length",
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
              className="h-full bg-gradient-to-r from-[#7401df] to-[#74ddc7] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Step 1: Contact Information */}
          {step === 1 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-foreground">
                Contact Information
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-foreground/70">
                    Full Name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    value={formData.fullName}
                    onChange={(e) => updateField("fullName", e.target.value)}
                    placeholder="Your full name"
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
                    placeholder="Business name (optional)"
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
                    placeholder="you@example.com"
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
                    placeholder="(910) 000-0000"
                    className="mt-1 bg-foreground/[0.04] border-border text-foreground placeholder:text-muted-foreground/60"
                  />
                </div>
              </div>
              <div>
                <Label className="text-foreground/70 mb-2 block">
                  Preferred Method of Contact{" "}
                  <span className="text-red-400">*</span>
                </Label>
                <div className="flex flex-wrap gap-4">
                  {["Email", "Phone", "Text", "Any"].map((method) => (
                    <RadioOption
                      key={method}
                      name="contactMethod"
                      value={method}
                      label={method}
                      checked={formData.contactMethod === method}
                      onChange={(v) => updateField("contactMethod", v)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Select Your Studio */}
          {step === 2 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-foreground">
                Select Your Studio
              </h3>
              <div className="space-y-3">
                {studioOptions.map((studio) => (
                  <label
                    key={studio.value}
                    className={`block cursor-pointer rounded-xl border p-4 transition-all ${
                      formData.studio === studio.value
                        ? "border-[#74ddc7]/50 bg-[#74ddc7]/[0.05]"
                        : "border-border hover:border-input"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          formData.studio === studio.value
                            ? "border-[#74ddc7] bg-[#74ddc7]"
                            : "border-white/30"
                        }`}
                        onClick={() => updateField("studio", studio.value)}
                      >
                        {formData.studio === studio.value && (
                          <div className="w-2 h-2 rounded-full bg-background" />
                        )}
                      </div>
                      <div
                        onClick={() => updateField("studio", studio.value)}
                      >
                        <p className="font-semibold text-foreground">
                          {studio.label}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {studio.description}
                        </p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Booking Details */}
          {step === 3 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-foreground">
                Booking Details
              </h3>
              <div>
                <Label className="text-foreground/70">Booking Type</Label>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {bookingTypes.map((type) => (
                    <RadioOption
                      key={type}
                      name="bookingType"
                      value={type}
                      label={type}
                      checked={formData.bookingType === type}
                      onChange={(v) => updateField("bookingType", v)}
                    />
                  ))}
                </div>
                {formData.bookingType === "Other" && (
                  <Input
                    value={formData.bookingTypeOther}
                    onChange={(e) =>
                      updateField("bookingTypeOther", e.target.value)
                    }
                    placeholder="Please specify..."
                    className="mt-3 bg-foreground/[0.04] border-border text-foreground placeholder:text-muted-foreground/60"
                  />
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-foreground/70">Preferred Date</Label>
                  <Input
                    type="date"
                    value={formData.preferredDate}
                    onChange={(e) =>
                      updateField("preferredDate", e.target.value)
                    }
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-foreground/70">Start Time</Label>
                  <Input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => updateField("startTime", e.target.value)}
                    className="mt-1 bg-foreground/[0.04] border-border text-foreground"
                  />
                </div>
                <div>
                  <Label className="text-foreground/70">End Time</Label>
                  <Input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => updateField("endTime", e.target.value)}
                    className="mt-1 bg-foreground/[0.04] border-border text-foreground"
                  />
                </div>
              </div>
              <div>
                <Label className="text-foreground/70 mb-2 block">
                  Total Time Needed
                </Label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {totalTimeOptions.map((opt) => (
                    <RadioOption
                      key={opt}
                      name="totalTime"
                      value={opt}
                      label={opt}
                      checked={formData.totalTime === opt}
                      onChange={(v) => updateField("totalTime", v)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Technical Needs */}
          {step === 4 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-foreground">
                Technical Needs
              </h3>
              <div>
                <Label className="text-foreground/70 mb-2 block">
                  Require host broadcast mic?
                </Label>
                <div className="flex gap-6">
                  {["Yes", "No"].map((opt) => (
                    <RadioOption
                      key={opt}
                      name="needHostMic"
                      value={opt}
                      label={opt}
                      checked={formData.needHostMic === opt}
                      onChange={(v) => updateField("needHostMic", v)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-foreground/70 mb-2 block">
                  Need guest microphones?
                </Label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    "None",
                    "1 guest mic",
                    "2 guest mics",
                    "3 guest mics",
                    "4+ guest mics",
                  ].map((opt) => (
                    <RadioOption
                      key={opt}
                      name="guestMics"
                      value={opt}
                      label={opt}
                      checked={formData.guestMics === opt}
                      onChange={(v) => updateField("guestMics", v)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-foreground/70 mb-2 block">
                  Need auxiliary inputs?
                </Label>
                <div className="flex flex-wrap gap-4">
                  {[
                    "Yes (DJ controller, mixer, instrument, etc.)",
                    "No",
                    "Not sure",
                  ].map((opt) => (
                    <RadioOption
                      key={opt}
                      name="auxiliaryInputs"
                      value={opt}
                      label={opt}
                      checked={formData.auxiliaryInputs === opt}
                      onChange={(v) => updateField("auxiliaryInputs", v)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-foreground/70 mb-2 block">
                  Will you be using:
                </Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {softwareOptions.map((opt) => (
                    <CheckboxOption
                      key={opt}
                      label={opt}
                      checked={formData.software.includes(opt)}
                      onChange={() => toggleArrayItem("software", opt)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-foreground/70">
                  Special technical requirements?
                </Label>
                <Textarea
                  value={formData.specialTechnical}
                  onChange={(e) =>
                    updateField("specialTechnical", e.target.value)
                  }
                  placeholder="Describe any special technical needs..."
                  className="mt-1 bg-foreground/[0.04] border-border text-foreground placeholder:text-muted-foreground/60 min-h-[100px]"
                />
              </div>
            </div>
          )}

          {/* Step 5: Content Details */}
          {step === 5 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-foreground">
                Content Details
              </h3>
              <div>
                <Label className="text-foreground/70">
                  Content type being created
                </Label>
                <Textarea
                  value={formData.contentType}
                  onChange={(e) => updateField("contentType", e.target.value)}
                  placeholder="E.g., podcast episode, commercial recording, interview, gaming stream, reaction video, live show, etc."
                  className="mt-1 bg-foreground/[0.04] border-border text-foreground placeholder:text-muted-foreground/60 min-h-[100px]"
                />
              </div>
              <div>
                <Label className="text-foreground/70 mb-2 block">
                  Bring additional equipment?
                </Label>
                <div className="flex gap-6">
                  {["Yes", "No"].map((opt) => (
                    <RadioOption
                      key={opt}
                      name="bringEquipment"
                      value={opt}
                      label={opt}
                      checked={formData.bringEquipment === opt}
                      onChange={(v) => updateField("bringEquipment", v)}
                    />
                  ))}
                </div>
                {formData.bringEquipment === "Yes" && (
                  <Input
                    value={formData.bringEquipmentDetails}
                    onChange={(e) =>
                      updateField("bringEquipmentDetails", e.target.value)
                    }
                    placeholder="Please describe..."
                    className="mt-3 bg-foreground/[0.04] border-border text-foreground placeholder:text-muted-foreground/60"
                  />
                )}
              </div>
              <div>
                <Label className="text-foreground/70 mb-2 block">
                  Need equipment setup assistance?
                </Label>
                <div className="flex gap-6">
                  {["Yes", "No"].map((opt) => (
                    <RadioOption
                      key={opt}
                      name="setupAssistance"
                      value={opt}
                      label={opt}
                      checked={formData.setupAssistance === opt}
                      onChange={(v) => updateField("setupAssistance", v)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-foreground/70 mb-2 block">
                  Need engineer / production assistant?
                </Label>
                <div className="flex flex-wrap gap-4">
                  {["Yes", "No", "Maybe (need guidance)"].map((opt) => (
                    <RadioOption
                      key={opt}
                      name="needEngineer"
                      value={opt}
                      label={opt}
                      checked={formData.needEngineer === opt}
                      onChange={(v) => updateField("needEngineer", v)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Add-On Options */}
          {step === 6 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-foreground">
                Add-On Options
              </h3>
              <p className="text-sm text-muted-foreground">
                Select any additional services you would like to include with
                your booking.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {addOnOptions.map((opt) => (
                  <CheckboxOption
                    key={opt}
                    label={opt}
                    checked={formData.addOns.includes(opt)}
                    onChange={() => toggleArrayItem("addOns", opt)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Step 7: Additional Information */}
          {step === 7 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-foreground">
                Additional Information
              </h3>
              <div>
                <Label className="text-foreground/70">
                  Additional details or special requests
                </Label>
                <Textarea
                  value={formData.additionalDetails}
                  onChange={(e) =>
                    updateField("additionalDetails", e.target.value)
                  }
                  placeholder="Share any additional information about your booking..."
                  className="mt-1 bg-foreground/[0.04] border-border text-foreground placeholder:text-muted-foreground/60 min-h-[120px]"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-foreground/70">
                  Upload Files (Logos, Show Notes, Scripts, Reference Content)
                </Label>
                {["Logos", "Show Notes", "Scripts", "Reference Content"].map(
                  (label) => (
                    <div
                      key={label}
                      className="rounded-lg border border-dashed border-input p-4 text-center cursor-pointer hover:border-foreground/20 transition-colors"
                    >
                      <p className="text-sm text-muted-foreground">
                        {label} — Click or drag a file to upload
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* Step 8: Budget & Billing */}
          {step === 8 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-foreground">
                Budget &amp; Billing
              </h3>
              <div>
                <Label className="text-foreground/70">
                  Estimated Budget Range ($)
                </Label>
                <Input
                  type="text"
                  value={formData.budget}
                  onChange={(e) => updateField("budget", e.target.value)}
                  placeholder="e.g. $200 - $500"
                  className="mt-1 bg-foreground/[0.04] border-border text-foreground placeholder:text-muted-foreground/60"
                />
              </div>
              <div>
                <Label className="text-foreground/70 mb-2 block">
                  Need invoice before session?
                </Label>
                <div className="flex gap-6">
                  {["Yes", "No"].map((opt) => (
                    <RadioOption
                      key={opt}
                      name="needInvoice"
                      value={opt}
                      label={opt}
                      checked={formData.needInvoice === opt}
                      onChange={(v) => updateField("needInvoice", v)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-foreground/70 mb-2 block">
                  Payment Method
                </Label>
                <div className="flex flex-wrap gap-4">
                  {["Card on File", "Pay at Session", "ACH"].map((opt) => (
                    <RadioOption
                      key={opt}
                      name="paymentMethod"
                      value={opt}
                      label={opt}
                      checked={formData.paymentMethod === opt}
                      onChange={(v) => updateField("paymentMethod", v)}
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
                className="bg-gradient-to-r from-[#7401df] to-[#4c1d95] text-white font-semibold hover:opacity-90"
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
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
