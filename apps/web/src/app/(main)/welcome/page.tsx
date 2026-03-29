"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Headphones,
  Mic2,
  Store,
  Music,
  Radio,
  Disc3,
  Bell,
  Upload,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type UserType = "listener" | "creator" | "vendor";
type CreatorType = "podcaster" | "musician" | "dj";

const GENRES = ["Hip-Hop", "R&B", "Gospel", "Jazz", "Talk"] as const;
const VENDOR_CATEGORIES = [
  "Food & Beverage",
  "Fashion & Apparel",
  "Health & Wellness",
  "Home & Garden",
  "Services",
  "Other",
] as const;

// ---------------------------------------------------------------------------
// Step Dots
// ---------------------------------------------------------------------------
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i === current
              ? "w-8 bg-[#74ddc7]"
              : i < current
                ? "w-2 bg-[#74ddc7]/40"
                : "w-2 bg-foreground/10"
          }`}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function WelcomePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [userType, setUserType] = useState<UserType | null>(null);

  // Step 2 - Listener
  const [genres, setGenres] = useState<string[]>([]);
  const [notifications, setNotifications] = useState(true);

  // Step 2 - Creator
  const [artistName, setArtistName] = useState("");
  const [creatorType, setCreatorType] = useState<CreatorType | null>(null);

  // Step 2 - Vendor
  const [businessName, setBusinessName] = useState("");
  const [vendorCategory, setVendorCategory] = useState("");
  const [vendorDescription, setVendorDescription] = useState("");

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  function toggleGenre(g: string) {
    setGenres((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g],
    );
  }

  function canAdvance(): boolean {
    if (step === 0) return userType !== null;
    if (step === 1) {
      if (userType === "listener") return genres.length > 0;
      if (userType === "creator") return artistName.trim() !== "" && creatorType !== null;
      if (userType === "vendor") return businessName.trim() !== "" && vendorCategory !== "";
    }
    return true;
  }

  async function handleFinish() {
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const updates: Record<string, unknown> = {
        id: user.id,
        user_type: userType,
        onboarded: true,
      };

      if (userType === "creator") {
        updates.artist_name = artistName;
        updates.creator_type = creatorType;
      } else if (userType === "vendor") {
        updates.display_name = businessName;
      }

      await supabase.from("profiles").upsert(updates);
    } catch {
      // Silently continue -- profile save is best-effort during beta
    } finally {
      setSaving(false);
      router.push("/my");
    }
  }

  // -------------------------------------------------------------------------
  // Accent color per user type
  // -------------------------------------------------------------------------
  const accent =
    userType === "listener"
      ? "#74ddc7"
      : userType === "creator"
        ? "#a78bfa"
        : userType === "vendor"
          ? "#f59e0b"
          : "#74ddc7";

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Step Dots */}
        <div className="mb-8">
          <StepDots current={step} total={3} />
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-8">
          {/* ─── Step 0: Choose Role ────────────────────────────────────── */}
          {step === 0 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#74ddc7]/10">
                  <Sparkles className="h-7 w-7 text-[#74ddc7]" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Welcome to WCCG 104.5
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  What brings you here?
                </p>
              </div>

              <div className="grid gap-3">
                {/* Listener */}
                <button
                  type="button"
                  onClick={() => setUserType("listener")}
                  className={`flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all ${
                    userType === "listener"
                      ? "border-[#74ddc7] bg-[#74ddc7]/5"
                      : "border-border hover:border-[#74ddc7]/30 hover:bg-foreground/[0.02]"
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                      userType === "listener"
                        ? "bg-[#74ddc7]/20"
                        : "bg-[#74ddc7]/10"
                    }`}
                  >
                    <Headphones className="h-6 w-6 text-[#74ddc7]" />
                  </div>
                  <div>
                    <p className="font-semibold">Listener</p>
                    <p className="text-xs text-muted-foreground">
                      Stream music, earn points, join contests
                    </p>
                  </div>
                  {userType === "listener" && (
                    <Check className="ml-auto h-5 w-5 text-[#74ddc7]" />
                  )}
                </button>

                {/* Creator */}
                <button
                  type="button"
                  onClick={() => setUserType("creator")}
                  className={`flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all ${
                    userType === "creator"
                      ? "border-[#a78bfa] bg-[#a78bfa]/5"
                      : "border-border hover:border-[#a78bfa]/30 hover:bg-foreground/[0.02]"
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                      userType === "creator"
                        ? "bg-[#a78bfa]/20"
                        : "bg-[#a78bfa]/10"
                    }`}
                  >
                    <Mic2 className="h-6 w-6 text-[#a78bfa]" />
                  </div>
                  <div>
                    <p className="font-semibold">Creator</p>
                    <p className="text-xs text-muted-foreground">
                      Upload music, host podcasts, build your brand
                    </p>
                  </div>
                  {userType === "creator" && (
                    <Check className="ml-auto h-5 w-5 text-[#a78bfa]" />
                  )}
                </button>

                {/* Vendor */}
                <button
                  type="button"
                  onClick={() => setUserType("vendor")}
                  className={`flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all ${
                    userType === "vendor"
                      ? "border-[#f59e0b] bg-[#f59e0b]/5"
                      : "border-border hover:border-[#f59e0b]/30 hover:bg-foreground/[0.02]"
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                      userType === "vendor"
                        ? "bg-[#f59e0b]/20"
                        : "bg-[#f59e0b]/10"
                    }`}
                  >
                    <Store className="h-6 w-6 text-[#f59e0b]" />
                  </div>
                  <div>
                    <p className="font-semibold">Vendor</p>
                    <p className="text-xs text-muted-foreground">
                      Sell products, book services, promote your business
                    </p>
                  </div>
                  {userType === "vendor" && (
                    <Check className="ml-auto h-5 w-5 text-[#f59e0b]" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ─── Step 1: Personalize ───────────────────────────────────── */}
          {step === 1 && userType === "listener" && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold">Pick Your Favorites</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Select the genres you love
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {GENRES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGenre(g)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                      genres.includes(g)
                        ? "border-[#74ddc7] bg-[#74ddc7]/10 text-[#74ddc7]"
                        : "border-border text-muted-foreground hover:border-[#74ddc7]/40"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border bg-foreground/[0.02] px-4 py-3">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-[#74ddc7]" />
                  <div>
                    <p className="text-sm font-medium">Enable Notifications</p>
                    <p className="text-xs text-muted-foreground">
                      Get alerts for new shows and contests
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={notifications}
                  onClick={() => setNotifications(!notifications)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
                    notifications ? "bg-[#74ddc7]" : "bg-foreground/20"
                  }`}
                >
                  <span
                    className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg transition-transform ${
                      notifications ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {step === 1 && userType === "creator" && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold">Set Up Your Profile</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tell us about your creative work
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground/70">
                  Artist / Creator Name
                </label>
                <input
                  type="text"
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  placeholder="Your stage name or brand"
                  className="w-full rounded-lg border border-border bg-foreground/[0.04] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-[#a78bfa]/50 focus:outline-none focus:ring-1 focus:ring-[#a78bfa]/30"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground/70">
                  What type of creator are you?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { key: "podcaster", label: "Podcaster", icon: Radio },
                      { key: "musician", label: "Musician", icon: Music },
                      { key: "dj", label: "DJ", icon: Disc3 },
                    ] as const
                  ).map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCreatorType(key)}
                      className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                        creatorType === key
                          ? "border-[#a78bfa] bg-[#a78bfa]/5"
                          : "border-border hover:border-[#a78bfa]/30"
                      }`}
                    >
                      <Icon
                        className={`h-6 w-6 ${
                          creatorType === key
                            ? "text-[#a78bfa]"
                            : "text-muted-foreground"
                        }`}
                      />
                      <span className="text-xs font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground/70">
                  Avatar
                </label>
                <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-border py-6 transition-colors hover:border-[#a78bfa]/30">
                  <div className="text-center">
                    <Upload className="mx-auto h-8 w-8 text-muted-foreground/40" />
                    <p className="mt-2 text-xs text-muted-foreground">
                      Drag & drop or click to upload
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 1 && userType === "vendor" && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold">Business Details</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Set up your vendor profile
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground/70">
                  Business Name
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Your business name"
                  className="w-full rounded-lg border border-border bg-foreground/[0.04] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-[#f59e0b]/50 focus:outline-none focus:ring-1 focus:ring-[#f59e0b]/30"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground/70">
                  Category
                </label>
                <select
                  value={vendorCategory}
                  onChange={(e) => setVendorCategory(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-border bg-foreground/[0.04] px-3 py-2 text-sm text-foreground focus:border-[#f59e0b]/50 focus:outline-none focus:ring-1 focus:ring-[#f59e0b]/30"
                >
                  <option value="">Select a category</option>
                  {VENDOR_CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-card">
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground/70">
                  Description
                </label>
                <textarea
                  value={vendorDescription}
                  onChange={(e) => setVendorDescription(e.target.value)}
                  placeholder="Tell customers about your business..."
                  rows={3}
                  className="w-full resize-none rounded-lg border border-border bg-foreground/[0.04] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-[#f59e0b]/50 focus:outline-none focus:ring-1 focus:ring-[#f59e0b]/30"
                />
              </div>
            </div>
          )}

          {/* ─── Step 2: Summary ───────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-6 text-center">
              <div>
                <div
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${accent}20` }}
                >
                  <Check className="h-8 w-8" style={{ color: accent }} />
                </div>
                <h2 className="text-2xl font-bold">You&apos;re All Set!</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Here&apos;s a summary of your choices
                </p>
              </div>

              <div className="space-y-3 text-left">
                <div className="rounded-xl border border-border bg-foreground/[0.02] px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Account Type
                  </p>
                  <p className="mt-1 text-sm font-semibold capitalize">
                    {userType}
                  </p>
                </div>

                {userType === "listener" && (
                  <>
                    <div className="rounded-xl border border-border bg-foreground/[0.02] px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Favorite Genres
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        {genres.join(", ")}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-foreground/[0.02] px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Notifications
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        {notifications ? "Enabled" : "Disabled"}
                      </p>
                    </div>
                  </>
                )}

                {userType === "creator" && (
                  <>
                    <div className="rounded-xl border border-border bg-foreground/[0.02] px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Artist Name
                      </p>
                      <p className="mt-1 text-sm font-semibold">{artistName}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-foreground/[0.02] px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Creator Type
                      </p>
                      <p className="mt-1 text-sm font-semibold capitalize">
                        {creatorType}
                      </p>
                    </div>
                  </>
                )}

                {userType === "vendor" && (
                  <>
                    <div className="rounded-xl border border-border bg-foreground/[0.02] px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Business Name
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        {businessName}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-foreground/[0.02] px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Category
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        {vendorCategory}
                      </p>
                    </div>
                    {vendorDescription && (
                      <div className="rounded-xl border border-border bg-foreground/[0.02] px-4 py-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Description
                        </p>
                        <p className="mt-1 text-sm text-foreground/80">
                          {vendorDescription}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* ─── Navigation ────────────────────────────────────────────── */}
          <div className="mt-8 flex items-center justify-between">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-foreground/[0.04]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 2 ? (
              <button
                type="button"
                disabled={!canAdvance()}
                onClick={() => setStep((s) => s + 1)}
                className="inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-black transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                style={{ backgroundColor: canAdvance() ? accent : undefined }}
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={handleFinish}
                className="inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-black transition-colors"
                style={{ backgroundColor: accent }}
              >
                {saving ? "Saving..." : "Go to Dashboard"}
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
