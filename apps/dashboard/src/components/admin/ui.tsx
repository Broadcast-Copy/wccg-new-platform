"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import type { Result } from "@/lib/admin";
import { cx } from "@/lib/format";

/* ---------------------------------------------------------------- styles -- */

export const FIELD =
  "w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm text-fg placeholder:text-faint outline-none transition focus:border-signal/60 focus:ring-2 focus:ring-signal/20 disabled:opacity-60";
export const LABEL = "block text-xs font-medium tracking-wide text-dim uppercase";
export const BTN =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-signal/40 disabled:cursor-not-allowed disabled:opacity-60";
export const BTN_PRIMARY = cx(BTN, "bg-signal text-fg hover:bg-signal-soft");
export const BTN_SECONDARY = cx(BTN, "border border-line bg-surface text-dim hover:bg-elevated hover:text-fg");
export const BTN_DANGER = cx(BTN, "border border-signal/40 bg-signal/10 text-signal-ink hover:bg-signal/20");

/* ------------------------------------------------------------ formatting -- */

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
}

/* -------------------------------------------------------------- feedback -- */

export function Spinner({ label }: { label: string }) {
  return (
    <div className="grid place-items-center py-16" role="status">
      <Loader2 className="h-6 w-6 animate-spin text-faint" aria-hidden />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function ErrorBox({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-amber/30 bg-amber/10 px-4 py-3 text-sm text-amber"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        <p className="mt-0.5 break-words">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 inline-flex items-center gap-1.5 font-medium underline underline-offset-2"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

export function InlineError({ message }: { message: string }) {
  return (
    <p role="alert" className="flex items-start gap-2 text-sm text-signal-ink">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-0 break-words">{message}</span>
    </p>
  );
}

export function InlineOk({ message }: { message: string }) {
  return (
    <p role="status" className="flex items-center gap-2 text-sm text-ok">
      <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

export function Notice({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "warn" }) {
  return (
    <div
      className={cx(
        "rounded-xl border px-4 py-3 text-sm",
        tone === "warn" ? "border-amber/30 bg-amber/10 text-amber" : "border-line bg-surface text-dim",
      )}
    >
      {children}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-dim">{children}</p>;
}

/* ------------------------------------------------------------------ chips -- */

export type ChipTone = "ok" | "warn" | "danger" | "muted";

const CHIP_TONE: Record<ChipTone, string> = {
  ok: "bg-ok/15 text-ok",
  warn: "bg-amber/15 text-amber",
  danger: "bg-signal/15 text-signal-ink",
  muted: "bg-elevated text-faint",
};

export function Chip({ tone, children }: { tone: ChipTone; children: React.ReactNode }) {
  return (
    <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", CHIP_TONE[tone])}>
      {children}
    </span>
  );
}

/** active -> ok, revoked/suspended/lost -> danger, expired/pending/... -> warn. */
export function statusTone(status: string): ChipTone {
  switch (status) {
    case "active":
    case "won":
    case "published":
      return "ok";
    case "revoked":
    case "suspended":
    case "archived":
    case "lost":
      return "danger";
    case "expired":
    case "inactive":
    case "maintenance":
    case "pending":
    case "new":
    case "draft":
      return "warn";
    default:
      return "muted";
  }
}

/* ---------------------------------------------------------------- headers -- */

export function SectionHeader({
  id,
  icon: Icon,
  title,
  description,
  actions,
}: {
  id?: string;
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-elevated text-dim">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 id={id} className="text-xl font-semibold tracking-tight">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-dim">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Refreshing({ on }: { on: boolean }) {
  if (!on) return null;
  return (
    <span role="status" className="inline-flex items-center gap-1.5 text-xs text-faint">
      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      Updating…
    </span>
  );
}

/* ------------------------------------------------------------------ copy -- */

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      /* clipboard blocked: the text is on screen to select by hand */
    }
  }

  return (
    <button type="button" onClick={copy} className={BTN_SECONDARY} aria-live="polite">
      {copied ? <Check className="h-4 w-4 text-ok" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
      {copied ? "Copied" : label}
    </button>
  );
}

/**
 * The one moment a full licence key exists outside the database. It is held
 * only in this component's props (never stored, logged or put in a URL) and
 * is gone once the admin dismisses it.
 */
export function KeyReveal({
  keyText,
  prefix,
  title,
  onDismiss,
}: {
  keyText: string;
  prefix: string;
  title: string;
  onDismiss: () => void;
}) {
  const headingId = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="region"
      aria-labelledby={headingId}
      className="rounded-2xl border-2 border-signal/50 bg-surface p-5 outline-none"
    >
      <h3 id={headingId} className="flex items-center gap-2 font-semibold">
        <KeyRound className="h-4 w-4 text-signal-ink" aria-hidden />
        {title}
      </h3>
      <p className="mt-1 text-sm text-dim">
        This is the only time the full key is shown. Only its fingerprint (a SHA-256 hash) and the prefix{" "}
        <span className="font-mono text-fg">{prefix}</span> are stored. Copy it to the customer or a password
        manager now; if it is lost, re-issue the key.
      </p>
      <p
        className="mt-4 rounded-lg border border-line bg-ink px-3 py-3 font-mono text-sm break-all text-fg select-all sm:text-base"
        aria-label="Licence key"
      >
        {keyText}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <CopyButton text={keyText} label="Copy key" />
        <button type="button" onClick={onDismiss} className={BTN_PRIMARY}>
          <Check className="h-4 w-4" aria-hidden />
          I have stored it
        </button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------- two-step confirm -- */

type ConfirmState =
  | { status: "idle" }
  | { status: "confirming" }
  | { status: "working" }
  | { status: "error"; message: string };

/**
 * A destructive action in two steps, inside the page (no window.confirm):
 * the first click opens an inline panel that says exactly what will happen;
 * only its own button runs the action. Optional `reason` collects the text
 * the database asks for (e.g. why a key is revoked).
 */
export function ConfirmAction({
  label,
  icon: Icon,
  title,
  body,
  confirmLabel,
  tone = "danger",
  reason,
  disabled,
  disabledReason,
  onConfirm,
  onDone,
}: {
  label: string;
  icon?: LucideIcon;
  title: string;
  body?: React.ReactNode;
  confirmLabel: string;
  tone?: "danger" | "neutral";
  reason?: { label: string; required: boolean; placeholder?: string };
  disabled?: boolean;
  disabledReason?: string;
  onConfirm: (reason: string) => Promise<Result<unknown>>;
  onDone?: () => void;
}) {
  const [state, setState] = useState<ConfirmState>({ status: "idle" });
  const [text, setText] = useState("");
  const panelId = useId();
  const titleId = useId();
  const whyId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  const open = state.status !== "idle";

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  async function run() {
    if (reason?.required && text.trim() === "") {
      setState({ status: "error", message: `${reason.label} is required.` });
      return;
    }
    setState({ status: "working" });
    const result = await onConfirm(text.trim());
    if (!result.ok) {
      setState({ status: "error", message: result.message });
      return;
    }
    setText("");
    setState({ status: "idle" });
    onDone?.();
  }

  const trigger = tone === "danger" ? BTN_DANGER : BTN_SECONDARY;

  return (
    <div className="contents">
      <button
        type="button"
        className={trigger}
        disabled={disabled || open}
        aria-describedby={disabled && disabledReason ? whyId : undefined}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setState({ status: "confirming" })}
      >
        {Icon && <Icon className="h-4 w-4" aria-hidden />}
        {label}
      </button>
      {disabled && disabledReason && (
        <span id={whyId} className="sr-only">
          {disabledReason}
        </span>
      )}
      {open && (
        <div
          id={panelId}
          ref={panelRef}
          tabIndex={-1}
          role="group"
          aria-labelledby={titleId}
          className={cx(
            "w-full basis-full rounded-xl border p-4 outline-none",
            tone === "danger" ? "border-signal/40 bg-signal/5" : "border-line bg-surface",
          )}
        >
          <p id={titleId} className="flex items-start gap-2 font-medium text-fg">
            <AlertTriangle
              className={cx("mt-0.5 h-4 w-4 shrink-0", tone === "danger" ? "text-signal-ink" : "text-amber")}
              aria-hidden
            />
            {title}
          </p>
          {body && <div className="mt-1.5 space-y-1 text-sm text-dim">{body}</div>}
          {reason && (
            <div className="mt-3 space-y-1.5">
              <label className={LABEL} htmlFor={`${panelId}-reason`}>
                {reason.label}
                {reason.required ? "" : " (optional)"}
              </label>
              <input
                id={`${panelId}-reason`}
                className={FIELD}
                value={text}
                maxLength={500}
                placeholder={reason.placeholder}
                onChange={(event) => setText(event.target.value)}
                disabled={state.status === "working"}
              />
            </div>
          )}
          {state.status === "error" && (
            <div className="mt-3">
              <InlineError message={state.message} />
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className={tone === "danger" ? cx(BTN, "bg-signal-ink text-ink hover:bg-signal-ink/90") : BTN_PRIMARY}
              onClick={run}
              disabled={state.status === "working"}
            >
              {state.status === "working" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {confirmLabel}
            </button>
            <button
              type="button"
              className={BTN_SECONDARY}
              onClick={() => {
                setText("");
                setState({ status: "idle" });
              }}
              disabled={state.status === "working"}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
