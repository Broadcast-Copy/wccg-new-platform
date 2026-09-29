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
import { PLATFORM_URL } from "@/lib/site";

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
  released: "2026-09-28",
  headline: "AirSuite On-Air joins the downloads",
  /** what fits beside NEW and the link on a phone */
  short: "On-Air is a download",
  summary:
    "install the on-air player, or the production app with its library service, from Broadcast Copy Manager 0.7.1.",
  href: "/changelog/",
} as const;

/* ------------------------------------------------------------------ */
/*  Customer documentation. The guides are MEMBERS-ONLY: they live in  */
/*  the bc_docs table (RLS: signed-in accounts) and render at          */
/*  platform.broadcastcopy.ai/docs, so no guide text is in this static */
/*  build. The public /documentation page says what they cover and     */
/*  where to sign in. (The five public teaser pages that used to live  */
/*  under /documentation/<slug>/ were removed 2026-09-27; .htaccess    */
/*  301s their old addresses to /documentation/.)                      */
/* ------------------------------------------------------------------ */

/** The member documentation on the control plane (sign-in required). */
export const MEMBER_DOCS_URL = `${PLATFORM_URL}/docs`;

/**
 * What the member documentation covers, for the public overview. Topic
 * names only — the guides themselves are behind sign-in.
 */
export const DOC_TOPICS = [
  {
    title: "Getting started",
    body: "The built-in guide on every page of the Production app, and installing and updating the suite with the Broadcast Copy Manager.",
  },
  {
    title: "The daily log",
    body: "Building a day's log step by step, the evening build and its validation gate, editing a log, and the profiles that sign every change.",
  },
  {
    title: "Traffic",
    body: "Getting booked spots into a day's log, and the traffic desk from orders to invoices.",
  },
  {
    title: "Production",
    body: "Imaging and the optional AI script writer, voice tracking in the VT editor, and scheduled airchecks with the recorder.",
  },
  {
    title: "Music",
    body: "The music section and DJ playlists — documented as they arrive.",
  },
] as const;

/* ------------------------------------------------------------------ */
/*  FAQ                                                                */
/* ------------------------------------------------------------------ */

export const FAQS = [
  {
    q: "Does this replace my automation system?",
    a: "Not on day one. AirSuite On-Air runs beside your current automation in a muted shadow mode first, and nothing reaches air until you switch it on — one piece at a time, when you trust it.",
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
    a: "Yes. Every station-scoped table carries a station ID, and row-level security in the database filters on it, not only the app. Before a second station goes live, the tables that hold private data move to strict per-station reads. The planned architecture goes further: each station gets its own database, and only shared records such as accounts and licences live in a common control plane.",
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
