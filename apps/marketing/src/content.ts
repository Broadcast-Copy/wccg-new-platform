import {
  AlertTriangle,
  AudioLines,
  CalendarClock,
  Disc3,
  LineChart,
  ListChecks,
  type LucideIcon,
  Megaphone,
  MonitorCog,
  PlayCircle,
  Radio,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types — declared once, content derives from them via `satisfies`.  */
/* ------------------------------------------------------------------ */

type Feature = {
  readonly name: string;
  readonly blurb: string;
  readonly icon: LucideIcon;
};

type Faq = { readonly q: string; readonly a: string };

type Stat = { readonly value: string; readonly label: string };

/* ------------------------------------------------------------------ */
/*  Proof — real numbers from the live flagship, WCCG 104.5 FM.        */
/* ------------------------------------------------------------------ */

export const STATS = [
  // counted off the flagship's live database, 2026-07-27
  { value: "27", label: "shows programmed" },
  { value: "44", label: "on-air hosts" },
  { value: "217K+", label: "loyalty events" },
  { value: "2,122", label: "on-demand items" },
] as const satisfies readonly Stat[];

/* ------------------------------------------------------------------ */
/*  The station OS                                                     */
/* ------------------------------------------------------------------ */

export const FEATURES = [
  {
    name: "On-air playout",
    icon: AudioLines,
    blurb:
      "AirSuite On-Air: three decks, the program log, hotkeys and live copy in one window. Sample-accurate segues, an audition bus that can never reach the transmitter, and a muted shadow mode that runs beside your current automation until you trust it.",
  },
  {
    name: "Streaming & channels",
    icon: Radio,
    blurb:
      "Multi-stream Icecast, Shoutcast or Centova with restream targets, live now-playing metadata, and a listener player on every channel.",
  },
  {
    name: "Programming & schedule",
    icon: CalendarClock,
    blurb:
      "Shows, hosts, dayparts and schedule blocks in one grid — which then drives your site, your player and your program guide automatically.",
  },
  {
    name: "The daily log",
    icon: ListChecks,
    blurb:
      "Tomorrow's log is built every evening from your clocks, music rules and the traffic file, then has to pass a validation gate — hours, hard times, restrictions, silent positions, booked spots — before it publishes. The PD edits it in a log editor that re-checks every change.",
  },
  {
    name: "DJ operations",
    icon: Disc3,
    blurb:
      "Drop intake over FTP, mix libraries, record pool, DJ slots and per-DJ portals — and Studio Sync, which lands each new mix in its cart checksum-verified and never swaps one that is on air.",
  },
  {
    name: "Listener loyalty",
    icon: Trophy,
    blurb:
      "Points, rewards, leaderboards and venue check-ins — server-authoritative, so balances can't be gamed from a browser console.",
  },
  {
    name: "Master control & EAS",
    icon: AlertTriangle,
    blurb:
      "Now-playing control, song history and EAS alert logging with an auditable trail your chief engineer can actually defend.",
  },
  {
    name: "Studio Control",
    icon: MonitorCog,
    blurb:
      "Every machine and service in the plant on one native board, with machine commands that take two presses. Plus a scheduled air-check recorder, the station command table, and library deletes that go to a recycle bin.",
  },
  {
    name: "FCC compliance",
    icon: ShieldCheck,
    blurb:
      "Public inspection file, EEO reporting, political file and deadline tracking — structured the way the Commission expects it.",
  },
  {
    name: "Ad sales & traffic",
    icon: LineChart,
    blurb:
      "Orders, copy, avails, as-run import, make-goods, invoicing and A/R, political requests and reports — a traffic desk that runs beside your current traffic system until you switch it on to feed the log.",
  },
  {
    name: "Promotions & imaging",
    icon: Megaphone,
    blurb:
      "Promotions calendars checked against the year's dates and exported to Word in their own layout. Imaging by category with a holiday calendar and an order-by date for each occasion — and an optional AI writer for draft scripts.",
  },
  {
    name: "Community & audience",
    icon: Users,
    blurb:
      "Groups, chat, events and profiles that turn anonymous listeners into first-party audience data you own outright.",
  },
  {
    name: "Agentic operations",
    icon: Sparkles,
    blurb:
      "Agents that draft copy, build schedules, produce spots and keep compliance current — the part that replaces the busywork.",
  },
] as const satisfies readonly Feature[];

export const ON_DEMAND_FEATURE = {
  name: "On-demand",
  icon: PlayCircle,
  blurb:
    "Podcasts, video and sermon archives with RSS feeds and shareable per-item pages.",
} as const satisfies Feature;

/* ------------------------------------------------------------------ */
/*  What's new — the home-page strip. Points at the changelog, which   */
/*  carries the full, dated list (bc_changelog 0.18.0-beta).           */
/* ------------------------------------------------------------------ */

export const WHATS_NEW = {
  released: "2026-09-27",
  headline: "Broadcast Copy Manager 0.5.0",
  /** what fits beside NEW and the link on a phone */
  short: "Manager 0.5.0 is out",
  summary:
    "the daily log and its validation gate, a traffic desk, promotions and imaging calendars, and Studio Control in a native window.",
  href: "/changelog",
} as const;

/* ------------------------------------------------------------------ */
/*  Task guides under /documentation — one definition drives the       */
/*  index rows and each guide's "related" links.                       */
/* ------------------------------------------------------------------ */

type Guide = {
  readonly slug: string;
  readonly title: string;
  readonly blurb: string;
  readonly who: string;
};

export const GUIDES = [
  {
    slug: "build-and-publish-a-days-log",
    title: "Build and publish a day's log",
    blurb:
      "How tomorrow's log is generated from your clocks, what the validation gate checks, and what happens when a check fails.",
    who: "Program director · operations",
  },
  {
    slug: "inserting-traffic",
    title: "Inserting traffic",
    blurb:
      "How booked spots reach a day's log — at generation, or into a day you are editing with a dry run first.",
    who: "Traffic · program director",
  },
  {
    slug: "editing-and-validating-a-log",
    title: "Editing and validating a log (PD)",
    blurb:
      "The log editor: what you can change, what it refuses, and how every saved edit is re-checked by the gate.",
    who: "Program director",
  },
  {
    slug: "imaging-ai-script-writer",
    title: "Imaging with the AI script writer",
    blurb:
      "Imaging categories, the holiday calendar and its order-by dates, and drafting scripts with the optional AI writer.",
    who: "Production · program director",
  },
  {
    slug: "traffic-basics",
    title: "Traffic section basics",
    blurb:
      "Orders, copy, the as-run, make-goods, invoicing and reports — and how the desk runs beside your current traffic system.",
    who: "Traffic · business office",
  },
] as const satisfies readonly Guide[];

export type GuideSlug = (typeof GUIDES)[number]["slug"];

/* ------------------------------------------------------------------ */
/*  FAQ                                                                */
/* ------------------------------------------------------------------ */

export const FAQS = [
  {
    q: "Does this replace my automation system?",
    a: "No. Broadcast Copy runs alongside your playout — the flagship is live today next to DJB Radio. We ingest now-playing and schedule data rather than replacing the box in your rack.",
  },
  {
    q: "Can I keep my own domain and branding?",
    a: "Yes. Every station gets its own domain and theme. WCCG 104.5 FM runs on wccg1045fm.com and looks nothing like a template.",
  },
  {
    q: "Do I have to move my stream host?",
    a: "No. Point us at your existing Icecast, Shoutcast or Centova mounts and we handle metadata, the player and restreaming from there.",
  },
  {
    q: "Is my station's data isolated from other stations?",
    a: "Yes, and it's enforced in the database rather than only in the app. Every station-scoped table carries a station id under row-level security, so one station cannot read another's rows even if the application layer is wrong.",
  },
  {
    q: "How does onboarding work?",
    a: "Early customers are onboarded white-glove. We provision your station, import your programming and hosts, and wire your streams with you — you are not left alone with a setup wizard.",
  },
  {
    q: "What about online-only or non-FCC stations?",
    a: "We're starting with licensed FCC stations so we can go deep on compliance. Online-only stations can join the waitlist and we'll reach out as we open up.",
  },
] as const satisfies readonly Faq[];
