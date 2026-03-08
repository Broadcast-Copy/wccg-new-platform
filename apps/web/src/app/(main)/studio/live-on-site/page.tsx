"use client";

import { useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Radio,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { LoginRequired } from "@/components/auth/login-required";

const TOTAL_STEPS = 9;

const eventTypes = [
  "Community Event",
  "Grand Opening",
  "Festival or Fair",
  "Concert or Performance",
  "Corporate Event",
  "School or Youth Event",
  "Charity or Nonprofit Event",
  "Private Event",
  "Other",
];

const djList = [
  "DJ Ike GDA",
  "DJ Tony Neal",
  "DJ Ricoveli",
  "DJ Chuck T",
  "DJ Izzy Nice",
  "DJ Yodo",
  "DJ Rayn",
  "DJ SpinWiz",
  "DJ DaddyBlack",
  "DJ Wolf",
  "DJ WhoSane",
  "DJ YaFeelMe",
  "DJ T-Money",
  "DJ Swazzey",
  "DJ TommyGeeMixxed",
  "DJ Tonelo",
  "DJ Weezy",
  "DJ Official",
  "DJ Lou",
  "DJ Diamonds",
  "DJ LJ",
  "DJ Chuck",
  "DJ Daffie",
  "DJ Dane Dinero",
  "DJ Itanist",
  "DJ Jay-B",
  "DJ Juice",
  "DJ Killako",
  "DJ KingViv",
];

const musicTypes = [
  "Hip-Hop",
  "R&B",
  "Old School",
  "Top 40",
  "Reggae / Dancehall",
  "Gospel",
  "Club / High Energy",
  "Family Friendly Mix",
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
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

export default function LiveOnSitePage() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    // Step 1: Event Details
    eventName: "",
    eventType: "",
    eventDescription: "",
    eventDate: "",
    startTime: "",
    endTime: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    zip: "",
    indoorOutdoor: "",
    estimatedAttendance: "",
    // Step 2: Service Selection
    services: [] as string[],
    // Step 3: DJ Selection
    selectedDJ: "",
    eventDuration: "",
    equipment: "",
    musicTypes: [] as string[],
    // Step 4: Live Remote Details
    remotePurpose: "",
    remotePurposeOther: "",
    liveOnAirMentions: "",
    spaceParking: "",
    // Step 5: Live Broadcast
    broadcastType: "",
    audioOutput: "",
    techContactName: "",
    techContactPhone: "",
    techContactEmail: "",
    // Step 6: Live Stream
    streamPlatforms: [] as string[],
    streamType: "",
    multipleCameras: "",
    internetProvision: "",
    // Step 7: Technical
    powerAccess: "",
    stageSetup: "",
    equipmentProvided: "",
    // Step 8: Marketing
    wccgPromotion: "",
    // Step 9: Contact
    name: "",
    organization: "",
    contactMethod: "",
    phone: "",
    email: "",
    additionalNotes: "",
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
      <LoginRequired fullPage message="Sign in to request live & on-site services. Plan your event broadcast with our production team.">
      <div className="space-y-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-red-950/50 to-gray-900 border border-border/30 p-10 text-center">
          <CheckCircle2 className="h-16 w-16 text-[#74ddc7] mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-3">
            Request Submitted!
          </h1>
          <p className="text-white/60 max-w-md mx-auto mb-6">
            Thank you for your live and on-site services request. Our events
            team will review your submission and contact you within 1-2 business
            days.
          </p>
          <Button
            asChild
            className="rounded-full bg-gradient-to-r from-[#dc2626] to-[#b91c1c] text-white font-semibold px-6"
          >
            <Link href="/studio">Back to Studios</Link>
          </Button>
        </div>
      </div>
      </LoginRequired>
    );
  }

  return (
    <LoginRequired fullPage message="Sign in to request live & on-site services. Plan your event broadcast with our production team.">
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-red-950/50 to-gray-900 border border-border/30">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, rgba(220,38,38,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 30%, rgba(116,221,199,0.2) 0%, transparent 50%)`,
            }}
          />
        </div>
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#dc2626] to-[#b91c1c] shadow-xl shadow-red-500/20">
              <Radio className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-2">
                Live &amp; On-Site Services
              </h1>
              <p className="text-base text-muted-foreground max-w-2xl">
                Bring your event to life with professional live and on-site
                production. High-quality audio, video, and on-air engagement for
                community events, grand openings, concerts, festivals, and
                corporate activations.
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
            "Event name or working title",
            "Brief event description including purpose and activities",
            "Logos, flyers, or branding materials (if available)",
            "Event location and technical requirements",
            "Preferred event date and timeline",
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
              className="h-full bg-gradient-to-r from-[#dc2626] to-[#74ddc7] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Step 1: Event Details */}
          {step === 1 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-foreground">
                Event Details
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-foreground/70">
                    Event Name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    value={formData.eventName}
                    onChange={(e) => updateField("eventName", e.target.value)}
                    placeholder="Your event name"
                    className="mt-1 bg-foreground/[0.04] border-border text-foreground placeholder:text-muted-foreground/60"
                  />
                </div>
                <div>
                  <Label className="text-foreground/70">Event Type</Label>
                  <select
                    value={formData.eventType}
                    onChange={(e) => updateField("eventType", e.target.value)}
                    className="mt-1 w-full rounded-md bg-foreground/[0.04] border border-border text-foreground/70 px-3 py-2 text-sm"
                  >
                    <option value="" className="bg-card">
                      Select event type...
                    </option>
                    {eventTypes.map((type) => (
                      <option key={type} value={type} className="bg-card">
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <Label className="text-foreground/70">Event Description</Label>
                <Textarea
                  value={formData.eventDescription}
                  onChange={(e) =>
                    updateField("eventDescription", e.target.value)
                  }
                  placeholder="Describe the purpose and activities of your event..."
                  className="mt-1 bg-foreground/[0.04] border-border text-foreground placeholder:text-muted-foreground/60 min-h-[100px]"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label className="text-foreground/70">Event Date</Label>
                  <Input
                    type="date"
                    value={formData.eventDate}
                    onChange={(e) => updateField("eventDate", e.target.value)}
                    className="mt-1 bg-foreground/[0.04] border-border text-foreground"
                  />
                </div>
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-foreground/70">Address Line 1</Label>
                  <Input
                    value={formData.address1}
                    onChange={(e) => updateField("address1", e.target.value)}
                    className="mt-1 bg-foreground/[0.04] border-border text-foreground placeholder:text-muted-foreground/60"
                  />
                </div>
                <div>
                  <Label className="text-foreground/70">Address Line 2</Label>
                  <Input
                    value={formData.address2}
                    onChange={(e) => updateField("address2", e.target.value)}
                    className="mt-1 bg-foreground/[0.04] border-border text-foreground placeholder:text-muted-foreground/60"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-4">
                <div>
                  <Label className="text-foreground/70">City</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    className="mt-1 bg-foreground/[0.04] border-border text-foreground placeholder:text-muted-foreground/60"
                  />
                </div>
                <div>
                  <Label className="text-foreground/70">State</Label>
                  <select
                    value={formData.state}
                    onChange={(e) => updateField("state", e.target.value)}
                    className="mt-1 w-full rounded-md bg-foreground/[0.04] border border-border text-foreground/70 px-3 py-2 text-sm"
                  >
                    <option value="" className="bg-card">
                      —
                    </option>
                    {US_STATES.map((s) => (
                      <option key={s} value={s} className="bg-card">
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-foreground/70">Zip Code</Label>
                  <Input
                    value={formData.zip}
                    onChange={(e) => updateField("zip", e.target.value)}
                    className="mt-1 bg-foreground/[0.04] border-border text-foreground placeholder:text-muted-foreground/60"
                  />
                </div>
                <div>
                  <Label className="text-foreground/70">Estimated Attendance</Label>
                  <Input
                    value={formData.estimatedAttendance}
                    onChange={(e) =>
                      updateField("estimatedAttendance", e.target.value)
                    }
                    className="mt-1 bg-foreground/[0.04] border-border text-foreground placeholder:text-muted-foreground/60"
                  />
                </div>
              </div>
              <div>
                <Label className="text-foreground/70 mb-2 block">
                  Indoor or Outdoor Event
                </Label>
                <div className="flex gap-6">
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
            </div>
          )}

          {/* Step 2: Service Selection */}
          {step === 2 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-foreground">
                Service Selection
              </h3>
              <p className="text-sm text-muted-foreground">
                Select the services you need for your event.
              </p>
              <div className="space-y-3">
                {[
                  {
                    value: "Live Remote",
                    desc: "Our station van arrives at your location for on-site engagement with your audience.",
                  },
                  {
                    value: "Live Broadcast from Your Venue",
                    desc: "Your event music and content streams live to our on-air broadcast.",
                  },
                  {
                    value: "Live Stream Production",
                    desc: "Digital channel streaming with audio and/or video options for online audiences.",
                  },
                ].map((svc) => (
                  <label
                    key={svc.value}
                    className={`block cursor-pointer rounded-xl border p-4 transition-all ${
                      formData.services.includes(svc.value)
                        ? "border-[#74ddc7]/50 bg-[#74ddc7]/[0.05]"
                        : "border-border hover:border-input"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          formData.services.includes(svc.value)
                            ? "border-[#74ddc7] bg-[#74ddc7]"
                            : "border-white/30"
                        }`}
                        onClick={() => toggleArrayItem("services", svc.value)}
                      >
                        {formData.services.includes(svc.value) && (
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
                      <div
                        onClick={() => toggleArrayItem("services", svc.value)}
                      >
                        <p className="font-semibold text-foreground">{svc.value}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{svc.desc}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: DJ Selection */}
          {step === 3 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-foreground">
                DJ Selection
              </h3>
              {!formData.services.includes("Live Remote") && (
                <div className="rounded-lg bg-foreground/[0.04] border border-border p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    DJ selection is available when &quot;Live Remote&quot; is
                    selected. You can skip this step.
                  </p>
                </div>
              )}
              {formData.services.includes("Live Remote") && (
                <>
                  <div>
                    <Label className="text-foreground/70">Select a DJ</Label>
                    <select
                      value={formData.selectedDJ}
                      onChange={(e) =>
                        updateField("selectedDJ", e.target.value)
                      }
                      className="mt-1 w-full rounded-md bg-foreground/[0.04] border border-border text-foreground/70 px-3 py-2 text-sm"
                    >
                      <option value="" className="bg-card">
                        Select a DJ...
                      </option>
                      {djList.map((dj) => (
                        <option
                          key={dj}
                          value={dj}
                          className="bg-card"
                        >
                          {dj}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-foreground/70">Event Duration</Label>
                    <select
                      value={formData.eventDuration}
                      onChange={(e) =>
                        updateField("eventDuration", e.target.value)
                      }
                      className="mt-1 w-full rounded-md bg-foreground/[0.04] border border-border text-foreground/70 px-3 py-2 text-sm"
                    >
                      <option value="" className="bg-card">
                        Select duration...
                      </option>
                      {["1 Hour", "2 Hours", "3 Hours", "4 Hours"].map(
                        (opt) => (
                          <option
                            key={opt}
                            value={opt}
                            className="bg-card"
                          >
                            {opt}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                  <div>
                    <Label className="text-foreground/70 mb-2 block">
                      Equipment Provision
                    </Label>
                    <div className="flex flex-wrap gap-4">
                      {[
                        "DJ Only",
                        "DJ + Sound",
                        "Sound Only + Mics (No DJ)",
                      ].map((opt) => (
                        <RadioOption
                          key={opt}
                          name="equipment"
                          value={opt}
                          label={opt}
                          checked={formData.equipment === opt}
                          onChange={(v) => updateField("equipment", v)}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-foreground/70 mb-2 block">
                      Music Type
                    </Label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {musicTypes.map((type) => (
                        <CheckboxOption
                          key={type}
                          label={type}
                          checked={formData.musicTypes.includes(type)}
                          onChange={() => toggleArrayItem("musicTypes", type)}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 4: Live Remote Details */}
          {step === 4 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-foreground">
                Live Remote Details
              </h3>
              {!formData.services.includes("Live Remote") && (
                <div className="rounded-lg bg-foreground/[0.04] border border-border p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    This step is for &quot;Live Remote&quot; bookings. You can
                    skip this step.
                  </p>
                </div>
              )}
              {formData.services.includes("Live Remote") && (
                <>
                  <div>
                    <Label className="text-foreground/70 mb-2 block">
                      Purpose of Live Remote
                    </Label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {[
                        "Grand Opening",
                        "Product Showcase",
                        "Promotion or Sale",
                        "Community Engagement",
                        "Fundraiser",
                        "Other",
                      ].map((opt) => (
                        <RadioOption
                          key={opt}
                          name="remotePurpose"
                          value={opt}
                          label={opt}
                          checked={formData.remotePurpose === opt}
                          onChange={(v) => updateField("remotePurpose", v)}
                        />
                      ))}
                    </div>
                    {formData.remotePurpose === "Other" && (
                      <Input
                        value={formData.remotePurposeOther}
                        onChange={(e) =>
                          updateField("remotePurposeOther", e.target.value)
                        }
                        placeholder="Please specify..."
                        className="mt-3 bg-foreground/[0.04] border-border text-foreground placeholder:text-muted-foreground/60"
                      />
                    )}
                  </div>
                  <div>
                    <Label className="text-foreground/70 mb-2 block">
                      Live on-air mentions wanted?
                    </Label>
                    <div className="flex gap-6">
                      {["Yes", "No"].map((opt) => (
                        <RadioOption
                          key={opt}
                          name="liveOnAirMentions"
                          value={opt}
                          label={opt}
                          checked={formData.liveOnAirMentions === opt}
                          onChange={(v) => updateField("liveOnAirMentions", v)}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-foreground/70">
                      Space &amp; Parking Requirements
                    </Label>
                    <Textarea
                      value={formData.spaceParking}
                      onChange={(e) =>
                        updateField("spaceParking", e.target.value)
                      }
                      placeholder="Describe space and parking available for our van and equipment..."
                      className="mt-1 bg-foreground/[0.04] border-border text-foreground placeholder:text-muted-foreground/60 min-h-[80px]"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 5: Live Broadcast from Your Venue */}
          {step === 5 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-foreground">
                Live Broadcast from Your Venue
              </h3>
              {!formData.services.includes(
                "Live Broadcast from Your Venue"
              ) && (
                <div className="rounded-lg bg-foreground/[0.04] border border-border p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    This step is for &quot;Live Broadcast&quot; bookings. You
                    can skip this step.
                  </p>
                </div>
              )}
              {formData.services.includes(
                "Live Broadcast from Your Venue"
              ) && (
                <>
                  <div>
                    <Label className="text-foreground/70 mb-2 block">
                      Type of On-Air Broadcast
                    </Label>
                    <div className="space-y-2">
                      {[
                        "Broadcast music from your DJ/venue",
                        "Broadcast announcements or commentary",
                        "Broadcast a combination of both",
                      ].map((opt) => (
                        <RadioOption
                          key={opt}
                          name="broadcastType"
                          value={opt}
                          label={opt}
                          checked={formData.broadcastType === opt}
                          onChange={(v) => updateField("broadcastType", v)}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-foreground/70 mb-2 block">
                      Audio output capability?
                    </Label>
                    <div className="flex flex-wrap gap-4">
                      {["Yes", "No", "Unsure (we will guide you)"].map(
                        (opt) => (
                          <RadioOption
                            key={opt}
                            name="audioOutput"
                            value={opt}
                            label={opt}
                            checked={formData.audioOutput === opt}
                            onChange={(v) => updateField("audioOutput", v)}
                          />
                        )
                      )}
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <Label className="text-foreground/70">
                        Technical Contact Name
                      </Label>
                      <Input
                        value={formData.techContactName}
                        onChange={(e) =>
                          updateField("techContactName", e.target.value)
                        }
                        className="mt-1 bg-foreground/[0.04] border-border text-foreground placeholder:text-muted-foreground/60"
                      />
                    </div>
                    <div>
                      <Label className="text-foreground/70">
                        Technical Contact Phone
                      </Label>
                      <Input
                        type="tel"
                        value={formData.techContactPhone}
                        onChange={(e) =>
                          updateField("techContactPhone", e.target.value)
                        }
                        className="mt-1 bg-foreground/[0.04] border-border text-foreground placeholder:text-muted-foreground/60"
                      />
                    </div>
                    <div>
                      <Label className="text-foreground/70">
                        Technical Contact Email
                      </Label>
                      <Input
                        type="email"
                        value={formData.techContactEmail}
                        onChange={(e) =>
                          updateField("techContactEmail", e.target.value)
                        }
                        className="mt-1 bg-foreground/[0.04] border-border text-foreground placeholder:text-muted-foreground/60"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 6: Live Stream Production */}
          {step === 6 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-foreground">
                Live Stream Production
              </h3>
              {!formData.services.includes("Live Stream Production") && (
                <div className="rounded-lg bg-foreground/[0.04] border border-border p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    This step is for &quot;Live Stream Production&quot;
                    bookings. You can skip this step.
                  </p>
                </div>
              )}
              {formData.services.includes("Live Stream Production") && (
                <>
                  <div>
                    <Label className="text-foreground/70 mb-2 block">
                      Live Stream Platforms
                    </Label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {[
                        "Facebook Live",
                        "YouTube Live",
                        "Instagram Live",
                        "Website / Custom Stream",
                        "Multi-Platform Simulcast",
                      ].map((opt) => (
                        <CheckboxOption
                          key={opt}
                          label={opt}
                          checked={formData.streamPlatforms.includes(opt)}
                          onChange={() =>
                            toggleArrayItem("streamPlatforms", opt)
                          }
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-foreground/70 mb-2 block">
                      Stream Type
                    </Label>
                    <div className="flex flex-wrap gap-4">
                      {["Audio Only", "Video Only", "Audio + Video"].map(
                        (opt) => (
                          <RadioOption
                            key={opt}
                            name="streamType"
                            value={opt}
                            label={opt}
                            checked={formData.streamType === opt}
                            onChange={(v) => updateField("streamType", v)}
                          />
                        )
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-foreground/70 mb-2 block">
                      Multiple cameras needed?
                    </Label>
                    <div className="flex gap-6">
                      {["Yes", "No", "Not sure"].map((opt) => (
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
                    <Label className="text-foreground/70 mb-2 block">
                      Internet provision needed?
                    </Label>
                    <div className="flex gap-6">
                      {["Yes", "No", "Unsure"].map((opt) => (
                        <RadioOption
                          key={opt}
                          name="internetProvision"
                          value={opt}
                          label={opt}
                          checked={formData.internetProvision === opt}
                          onChange={(v) => updateField("internetProvision", v)}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 7: Technical Requirements */}
          {step === 7 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-foreground">
                Technical Requirements
              </h3>
              <div>
                <Label className="text-foreground/70 mb-2 block">
                  Power Access Available?
                </Label>
                <div className="flex flex-wrap gap-4">
                  {["Yes", "No", "Limited (explain)"].map((opt) => (
                    <RadioOption
                      key={opt}
                      name="powerAccess"
                      value={opt}
                      label={opt}
                      checked={formData.powerAccess === opt}
                      onChange={(v) => updateField("powerAccess", v)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-foreground/70 mb-2 block">
                  Stage or Booth Setup Needed?
                </Label>
                <div className="flex flex-wrap gap-4">
                  {["Yes", "No", "Not sure (explain)"].map((opt) => (
                    <RadioOption
                      key={opt}
                      name="stageSetup"
                      value={opt}
                      label={opt}
                      checked={formData.stageSetup === opt}
                      onChange={(v) => updateField("stageSetup", v)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-foreground/70">
                  Equipment You Will Provide
                </Label>
                <Textarea
                  value={formData.equipmentProvided}
                  onChange={(e) =>
                    updateField("equipmentProvided", e.target.value)
                  }
                  placeholder="List any equipment you will be providing..."
                  className="mt-1 bg-foreground/[0.04] border-border text-foreground placeholder:text-muted-foreground/60 min-h-[80px]"
                />
              </div>
            </div>
          )}

          {/* Step 8: Marketing & Promotion */}
          {step === 8 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-foreground">
                Marketing &amp; Promotion
              </h3>
              <div>
                <Label className="text-foreground/70 mb-2 block">
                  Would you like WCCG to promote your event?
                </Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    "Yes, on-air",
                    "Yes, social media",
                    "Both",
                    "No",
                  ].map((opt) => (
                    <RadioOption
                      key={opt}
                      name="wccgPromotion"
                      value={opt}
                      label={opt}
                      checked={formData.wccgPromotion === opt}
                      onChange={(v) => updateField("wccgPromotion", v)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-foreground/70">
                  Upload Flyers, Logos, or Branding
                </Label>
                <div className="mt-2 rounded-lg border border-dashed border-input p-6 text-center cursor-pointer hover:border-foreground/20 transition-colors">
                  <p className="text-sm text-muted-foreground">
                    Click or drag a file to upload
                  </p>
                </div>
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
                    Organization / Business Name
                  </Label>
                  <Input
                    value={formData.organization}
                    onChange={(e) =>
                      updateField("organization", e.target.value)
                    }
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
            <div className="flex gap-2">
              {/* Skip button for conditional steps */}
              {[3, 4, 5, 6].includes(step) && (
                <Button
                  variant="ghost"
                  onClick={() => setStep(step + 1)}
                  className="text-muted-foreground hover:text-foreground/60 hover:bg-foreground/[0.04]"
                >
                  Skip Step
                </Button>
              )}
              {step < TOTAL_STEPS ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  className="bg-gradient-to-r from-[#dc2626] to-[#b91c1c] text-white font-semibold hover:opacity-90"
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
                    const submission = { ...formData, submittedAt: new Date().toISOString(), type: 'live-on-site' };
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
