import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, BookOpen, CircleHelp, History, MessageSquare, ShieldCheck } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { MEMBER_DOCS_URL } from "@/content";
import { WAITLIST_HREF } from "@/lib/nav";
import { BROADCAST_COPY_MANAGER, SITE_URL } from "@/lib/site";

const title = "Support — Broadcast Copy";
const description =
  "Where Broadcast Copy's help lives: the Guide on every page of the Production app, the customer documentation behind sign-in, the Manager's checksum-verified updates, the changelog, and the waitlist form for questions.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/support` },
  openGraph: { title, description, type: "website", url: `${SITE_URL}/support` },
};

/**
 * Only channels that exist (owner, 2026-09-27). No email address, phone
 * number, hours, response time or ticket system is offered here because none
 * has been set up; the waitlist form is the one way to reach the team. If a
 * support contact is created, add it here - do not invent one.
 */

type Channel = {
  icon: LucideIcon;
  title: string;
  body: React.ReactNode;
  action?: { href: string; label: string; external?: boolean };
};

const manager = BROADCAST_COPY_MANAGER;

const CHANNELS: Channel[] = [
  {
    icon: CircleHelp,
    title: "The Guide, on every page",
    body: (
      <>
        In the Production app, press <b className="font-semibold text-fg">Guide</b> or{" "}
        <kbd className="rounded border border-line bg-elevated px-1.5 py-0.5 font-mono text-xs text-fg">
          F1
        </kbd>{" "}
        on any page. It opens that page&rsquo;s own walkthrough: what the page does to air, the
        steps in order, and <b className="font-semibold text-fg">Show me</b>, which points at the
        real control. F1 again closes it.
      </>
    ),
  },
  {
    icon: BookOpen,
    title: "Customer documentation",
    body: "Step-by-step guides for the daily log, traffic, production and installing the suite, written against the real screens. They are for customers: sign in on the platform to read them.",
    action: { href: MEMBER_DOCS_URL, label: "Sign in to the guides", external: true },
  },
  {
    icon: ShieldCheck,
    title: "Installing and updating",
    body: (
      <>
        The Broadcast Copy Manager&rsquo;s <b className="font-semibold text-fg">Updates</b> window
        shows what is installed and what is available, and installs an update when you ask. Every
        artifact is checked against its published SHA-256 first; a download that does not match is
        discarded. To check the Manager download itself, compare its hash with the one on the
        Download page:
        <pre className="mt-3 overflow-x-auto rounded-lg border border-line bg-ink px-4 py-3 font-mono text-[13px] leading-relaxed text-fg">
          <code>{`Get-FileHash .\\BroadcastCopyManager-${manager.version}.zip -Algorithm SHA256`}</code>
        </pre>
      </>
    ),
    action: { href: "/download/", label: "Download and checksums" },
  },
  {
    icon: History,
    title: "What changed",
    body: "Every release of Broadcast Copy is in the changelog, versioned and dated — the flagship station runs the same builds.",
    action: { href: "/changelog/", label: "Read the changelog" },
  },
];

export default function SupportPage() {
  return (
    <PageShell
      eyebrow="Support"
      title="Help, where it actually lives."
      lede="Most answers are inside the software itself, a keypress away. Here is where to find them — and how to reach the team when they are not enough."
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {CHANNELS.map((c) => (
          <section
            key={c.title}
            className="flex min-w-0 flex-col rounded-2xl border border-line bg-surface p-5 sm:p-6"
          >
            <c.icon className="h-6 w-6 text-signal-ink" aria-hidden />
            <h2 className="mt-4 text-lg font-semibold tracking-tight">{c.title}</h2>
            <div className="mt-2 min-w-0 flex-1 text-sm leading-relaxed text-dim">{c.body}</div>
            {c.action ? (
              c.action.external ? (
                <a
                  href={c.action.href}
                  className="mt-4 inline-flex min-h-11 items-center gap-1.5 self-start font-semibold text-signal-ink underline-offset-2 hover:underline"
                >
                  {c.action.label}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </a>
              ) : (
                <Link
                  href={c.action.href}
                  className="mt-4 inline-flex min-h-11 items-center gap-1.5 self-start font-semibold text-signal-ink underline-offset-2 hover:underline"
                >
                  {c.action.label}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              )
            ) : null}
          </section>
        ))}
      </div>

      <section className="mt-10 flex flex-col gap-5 rounded-2xl border border-line bg-elevated p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex gap-4">
          <MessageSquare className="mt-1 h-6 w-6 flex-none text-signal-ink" aria-hidden />
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Questions, and everything else</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-dim">
              The waitlist form is how to reach the team today — for questions about the product,
              pricing, or moving a station over. Tell us about your station and what you need.
            </p>
          </div>
        </div>
        <Link
          href={WAITLIST_HREF}
          className="inline-flex min-h-12 flex-none items-center justify-center gap-2 rounded-lg bg-signal px-6 text-sm font-semibold text-fg transition hover:bg-signal-soft"
        >
          Join the waitlist <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </section>
    </PageShell>
  );
}
