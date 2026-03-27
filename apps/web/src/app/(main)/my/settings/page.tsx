"use client";

import { useState } from "react";
import {
  Settings,
  User,
  Bell,
  Monitor,
  Shield,
  Link2,
  Save,
  Sun,
  Moon,
  Laptop,
  Eye,
  EyeOff,
  Lock,
  Trash2,
  KeyRound,
  ChevronDown,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Toggle Switch Component
// ---------------------------------------------------------------------------
function Toggle({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-[#74ddc7]" : "bg-foreground/20"
      }`}
    >
      <span
        className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Pill Toggle Component (for theme / points display)
// ---------------------------------------------------------------------------
function PillToggle<T extends string>({
  options,
  value,
  onChange,
  icons,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  icons?: Record<T, React.ReactNode>;
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-border bg-foreground/[0.04] p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
            value === opt.value
              ? "bg-[#74ddc7] text-black shadow-sm"
              : "text-muted-foreground hover:text-foreground/90/80"
          }`}
        >
          {icons?.[opt.value]}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section Card Wrapper
// ---------------------------------------------------------------------------
function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#74ddc7]/10">
          <Icon className="h-5 w-5 text-[#74ddc7]" />
        </div>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Streams list
// ---------------------------------------------------------------------------
const STREAMS = [
  "WCCG 104.5",
  "Soul 104.5",
  "Hot 104.5",
  "The Vibe",
  "MixxSquadd",
  "Yard & Riddim",
] as const;

// ---------------------------------------------------------------------------
// Connected account providers
// ---------------------------------------------------------------------------
const CONNECTED_PROVIDERS = [
  {
    name: "Google",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
    ),
  },
  {
    name: "Apple",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
    ),
  },
  {
    name: "Spotify",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
      </svg>
    ),
  },
] as const;

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------
export default function SettingsPage() {
  // Profile
  const [displayName, setDisplayName] = useState("DJ Listener");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");

  // Notifications
  const [showAlerts, setShowAlerts] = useState(true);
  const [contestUpdates, setContestUpdates] = useState(true);
  const [eventReminders, setEventReminders] = useState(true);
  const [dukeAlerts, setDukeAlerts] = useState(false);
  const [dealNotifications, setDealNotifications] = useState(true);
  const [pointsUpdates, setPointsUpdates] = useState(true);

  // Account
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");
  const [defaultStream, setDefaultStream] = useState(STREAMS[0]);
  const [showPoints, setShowPoints] = useState(true);

  // Save feedback
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // -------------------------------------------------------------------------
  // Input field helper
  // -------------------------------------------------------------------------
  function InputField({
    label,
    value,
    onChange,
    placeholder,
    type = "text",
    readOnly = false,
  }: {
    label: string;
    value: string;
    onChange?: (v: string) => void;
    placeholder?: string;
    type?: string;
    readOnly?: boolean;
  }) {
    return (
      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground/70">
          {label}
        </label>
        <input
          type={type}
          value={value}
          readOnly={readOnly}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-lg border border-border bg-foreground/[0.04] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-[#74ddc7]/50 focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/30 ${
            readOnly ? "cursor-not-allowed opacity-60" : ""
          }`}
        />
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Notification row helper
  // -------------------------------------------------------------------------
  function NotifRow({
    label,
    checked,
    onChange,
  }: {
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
  }) {
    return (
      <div className="flex items-center justify-between py-2">
        <span className="text-sm text-foreground/80">{label}</span>
        <Toggle checked={checked} onChange={onChange} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#74ddc7]/10">
            <Settings className="h-5 w-5 text-[#74ddc7]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Manage your profile, preferences, and account
            </p>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Profile Settings                                                   */}
      {/* ----------------------------------------------------------------- */}
      <SectionCard icon={User} title="Profile Settings">
        <div className="space-y-4">
          <InputField
            label="Display Name"
            value={displayName}
            onChange={setDisplayName}
            placeholder="Your display name"
          />
          <InputField
            label="Email"
            value="listener@wccg.fm"
            readOnly
          />
          <InputField
            label="Phone Number"
            value={phone}
            onChange={setPhone}
            placeholder="(555) 123-4567"
            type="tel"
          />
          <InputField
            label="City / Location"
            value={city}
            onChange={setCity}
            placeholder="Durham, NC"
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/70">
              Bio / About
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us a little about yourself..."
              rows={3}
              className="w-full rounded-lg border border-border bg-foreground/[0.04] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-[#74ddc7]/50 focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/30 resize-none"
            />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-lg bg-[#74ddc7] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[#5ec4af]"
            >
              <Save className="h-4 w-4" />
              Save Changes
            </button>
            {saved && (
              <span className="text-sm text-[#74ddc7] animate-in fade-in">
                Saved successfully!
              </span>
            )}
          </div>
        </div>
      </SectionCard>

      {/* ----------------------------------------------------------------- */}
      {/* Notification Preferences                                           */}
      {/* ----------------------------------------------------------------- */}
      <SectionCard icon={Bell} title="Notification Preferences">
        <div className="divide-y divide-border/50">
          <NotifRow label="Show Alerts" checked={showAlerts} onChange={setShowAlerts} />
          <NotifRow label="Contest Updates" checked={contestUpdates} onChange={setContestUpdates} />
          <NotifRow label="Event Reminders" checked={eventReminders} onChange={setEventReminders} />
          <NotifRow label="Duke Game Alerts" checked={dukeAlerts} onChange={setDukeAlerts} />
          <NotifRow label="Deal Notifications" checked={dealNotifications} onChange={setDealNotifications} />
          <NotifRow label="Points Updates" checked={pointsUpdates} onChange={setPointsUpdates} />
        </div>
      </SectionCard>

      {/* ----------------------------------------------------------------- */}
      {/* Account Settings                                                   */}
      {/* ----------------------------------------------------------------- */}
      <SectionCard icon={Monitor} title="Account Settings">
        <div className="space-y-5">
          {/* Theme */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground/70">
              Theme Preference
            </label>
            <PillToggle
              options={[
                { label: "System", value: "system" as const },
                { label: "Light", value: "light" as const },
                { label: "Dark", value: "dark" as const },
              ]}
              value={theme}
              onChange={setTheme}
              icons={{
                system: <Laptop className="h-3.5 w-3.5" />,
                light: <Sun className="h-3.5 w-3.5" />,
                dark: <Moon className="h-3.5 w-3.5" />,
              }}
            />
          </div>

          {/* Default Stream */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/70">
              Default Stream
            </label>
            <div className="relative">
              <select
                value={defaultStream}
                onChange={(e) => setDefaultStream(e.target.value as typeof defaultStream)}
                className="w-full appearance-none rounded-lg border border-border bg-foreground/[0.04] px-3 py-2 pr-10 text-sm text-foreground focus:border-[#74ddc7]/50 focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/30"
              >
                {STREAMS.map((s) => (
                  <option key={s} value={s} className="bg-card text-foreground">
                    {s}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
            </div>
          </div>

          {/* Points Display */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground/80">Points Display</p>
              <p className="text-xs text-muted-foreground/60">
                {showPoints ? "Points are visible on your profile" : "Points are hidden from your profile"}
              </p>
            </div>
            <PillToggle
              options={[
                { label: "Show", value: "show" as const },
                { label: "Hide", value: "hide" as const },
              ]}
              value={showPoints ? "show" : "hide"}
              onChange={(v) => setShowPoints(v === "show")}
              icons={{
                show: <Eye className="h-3.5 w-3.5" />,
                hide: <EyeOff className="h-3.5 w-3.5" />,
              }}
            />
          </div>
        </div>
      </SectionCard>

      {/* ----------------------------------------------------------------- */}
      {/* Privacy & Security                                                 */}
      {/* ----------------------------------------------------------------- */}
      <SectionCard icon={Shield} title="Privacy & Security">
        <div className="space-y-4">
          {/* Change Password */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground/80">Change Password</p>
              <p className="text-xs text-muted-foreground/60">Coming soon</p>
            </div>
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-foreground/[0.04] px-3 py-1.5 text-sm text-muted-foreground/60 cursor-not-allowed"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Change
            </button>
          </div>

          {/* 2FA */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground/80">Two-Factor Authentication</p>
              <p className="text-xs text-muted-foreground/60">Coming soon</p>
            </div>
            <Toggle checked={false} onChange={() => {}} disabled />
          </div>

          {/* Delete Account */}
          <div className="border-t border-border/50 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-400">Delete Account</p>
                <p className="text-xs text-muted-foreground/60">Contact support to delete your account</p>
              </div>
              <button
                type="button"
                disabled
                className="inline-flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-sm text-red-400/50 cursor-not-allowed"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ----------------------------------------------------------------- */}
      {/* Connected Accounts                                                 */}
      {/* ----------------------------------------------------------------- */}
      <SectionCard icon={Link2} title="Connected Accounts">
        <div className="space-y-3">
          {CONNECTED_PROVIDERS.map((provider) => (
            <div
              key={provider.name}
              className="flex items-center justify-between rounded-xl border border-border/50 bg-foreground/[0.02] px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground/[0.04] text-muted-foreground">
                  {provider.icon}
                </div>
                <div>
                  <p className="text-sm font-medium">{provider.name}</p>
                  <p className="text-xs text-muted-foreground/60">Not connected</p>
                </div>
              </div>
              <button
                type="button"
                className="rounded-lg border border-border bg-foreground/[0.04] px-3 py-1.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-foreground/[0.08] hover:text-foreground/90"
              >
                Connect
              </button>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Bottom spacer */}
      <div className="h-8" />
    </div>
  );
}
