"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Shield,
  KeyRound,
  Smartphone,
  Monitor,
  Trash2,
  Save,
  Eye,
  EyeOff,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Section Card (matches settings page pattern)
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
// Coming Soon Badge
// ---------------------------------------------------------------------------
function ComingSoonBadge() {
  return (
    <span className="rounded-full bg-foreground/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      Coming Soon
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function SecurityPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function handleChangePassword() {
    setMessage(null);

    if (newPassword.length < 8) {
      setMessage({
        type: "error",
        text: "Password must be at least 8 characters.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        setMessage({
          type: "success",
          text: "Password updated successfully.",
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setMessage({
        type: "error",
        text: "Something went wrong. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  // -------------------------------------------------------------------------
  // Password Input Helper
  // -------------------------------------------------------------------------
  function PasswordInput({
    label,
    value,
    onChange,
    show,
    onToggleShow,
    placeholder,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    show: boolean;
    onToggleShow: () => void;
    placeholder: string;
  }) {
    return (
      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground/70">
          {label}
        </label>
        <div className="relative">
          <input
            type={show ? "text" : "password"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-lg border border-border bg-foreground/[0.04] px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-[#74ddc7]/50 focus:outline-none focus:ring-1 focus:ring-[#74ddc7]/30"
          />
          <button
            type="button"
            onClick={onToggleShow}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground/70"
          >
            {show ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#74ddc7]/10">
          <Shield className="h-5 w-5 text-[#74ddc7]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Account Security
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your password and security settings
          </p>
        </div>
      </div>

      {/* ─── Change Password ──────────────────────────────────────────── */}
      <SectionCard icon={KeyRound} title="Change Password">
        <div className="space-y-4">
          <PasswordInput
            label="Current Password"
            value={currentPassword}
            onChange={setCurrentPassword}
            show={showCurrent}
            onToggleShow={() => setShowCurrent(!showCurrent)}
            placeholder="Enter current password"
          />
          <PasswordInput
            label="New Password"
            value={newPassword}
            onChange={setNewPassword}
            show={showNew}
            onToggleShow={() => setShowNew(!showNew)}
            placeholder="Enter new password"
          />
          <PasswordInput
            label="Confirm New Password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            show={showConfirm}
            onToggleShow={() => setShowConfirm(!showConfirm)}
            placeholder="Re-enter new password"
          />

          {message && (
            <div
              className={`rounded-lg px-4 py-2.5 text-sm ${
                message.type === "success"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              {message.text}
            </div>
          )}

          <button
            type="button"
            disabled={saving || !newPassword || !confirmPassword}
            onClick={handleChangePassword}
            className="inline-flex items-center gap-2 rounded-lg bg-[#74ddc7] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[#5ec4af] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Updating..." : "Update Password"}
          </button>
        </div>
      </SectionCard>

      {/* ─── Two-Factor Authentication ────────────────────────────────── */}
      <SectionCard icon={Smartphone} title="Two-Factor Authentication">
        <div className="flex items-start justify-between">
          <div>
            <div className="mb-2">
              <ComingSoonBadge />
            </div>
            <p className="text-sm text-muted-foreground">
              Add an extra layer of security to your account by requiring a
              verification code from your phone in addition to your password.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* ─── Active Sessions ──────────────────────────────────────────── */}
      <SectionCard icon={Monitor} title="Active Sessions">
        <div className="flex items-start justify-between">
          <div>
            <div className="mb-2">
              <ComingSoonBadge />
            </div>
            <p className="text-sm text-muted-foreground">
              View and manage devices and browsers currently signed in to your
              account. Revoke access to sessions you don&apos;t recognize.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* ─── Delete Account ───────────────────────────────────────────── */}
      <div className="rounded-2xl border border-red-500/20 bg-card p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10">
            <Trash2 className="h-5 w-5 text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-red-400">
            Delete Account
          </h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl bg-red-500/5 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            <div>
              <p className="text-sm font-medium text-red-400">
                This action is permanent
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Deleting your account will remove all your data, including
                listening history, points, playlists, and any vendor or creator
                content. This action cannot be undone.
              </p>
            </div>
          </div>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
          >
            Contact Support
          </Link>
        </div>
      </div>

      {/* Bottom spacer */}
      <div className="h-8" />
    </div>
  );
}
