import {
  AlertTriangle,
  CalendarClock,
  Disc3,
  LineChart,
  type LucideIcon,
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

type Plan = {
  readonly id: string;
  readonly name: string;
  readonly price: string;
  readonly cadence: string;
  readonly tagline: string;
  readonly points: readonly string[];
  readonly cta: string;
  readonly featured: boolean;
};

type AddOn = {
  readonly name: string;
  readonly price: string;
  readonly blurb: string;
};

type Faq = { readonly q: string; readonly a: string };

type Stat = { readonly value: string; readonly label: string };

/* ------------------------------------------------------------------ */
/*  Proof — real numbers from the live flagship, WCCG 104.5 FM.        */
/* ------------------------------------------------------------------ */

export const STATS = [
  { value: "27", label: "shows programmed" },
  { value: "44", label: "on-air hosts" },
  { value: "216K+", label: "loyalty events" },
  { value: "1,441", label: "on-demand items" },
] as const satisfies readonly Stat[];

/* ------------------------------------------------------------------ */
/*  The station OS                                                     */
/* ------------------------------------------------------------------ */

export const FEATURES = [
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
    name: "DJ operations",
    icon: Disc3,
    blurb:
      "Drop intake over FTP, mix libraries, record pool, DJ slots and per-DJ portals. The workflow your air staff already knows.",
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
    name: "FCC compliance",
    icon: ShieldCheck,
    blurb:
      "Public inspection file, EEO reporting, political file and deadline tracking — structured the way the Commission expects it.",
  },
  {
    name: "Ad sales & traffic",
    icon: LineChart,
    blurb:
      "Advertisers, campaigns, avails, creative, invoices and A/R — sales and traffic living in the same system as the air product.",
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
/*  Pricing                                                            */
/* ------------------------------------------------------------------ */

export const PLANS = [
  {
    id: "account",
    name: "Account",
    price: "$0",
    cadence: "free forever",
    tagline: "Create your organization and look around before you commit.",
    featured: false,
    points: [
      "Organization + team accounts",
      "Multi-station cockpit",
      "Invite your GM, OM and staff",
      "No card required",
    ],
    cta: "Start free",
  },
  {
    id: "broadcast",
    name: "Broadcast",
    price: "$49.99",
    cadence: "per licensed station / month",
    tagline: "The full station OS for one FCC station.",
    featured: true,
    points: [
      "Streaming, channels + restream",
      "Programming, schedule + player",
      "DJ operations and portals",
      "Listener loyalty + community",
      "Ad sales, traffic and A/R",
      "Your own domain and theme",
    ],
    cta: "Get early access",
  },
  {
    id: "group",
    name: "Multi-station",
    price: "Custom",
    cadence: "groups & conglomerates",
    tagline: "For operators running a cluster — or a hundred.",
    featured: false,
    points: [
      "Declining per-station rate",
      "Group-wide GM/OM cockpit",
      "Onboarding + data migration",
      "Priority support",
    ],
    cta: "Talk to us",
  },
] as const satisfies readonly Plan[];

export const ADD_ONS = [
  {
    name: "FCC Compliance Pack",
    price: "$29–49 / station / mo",
    blurb:
      "Public inspection file, EEO, political file and automated filing deadlines.",
  },
  {
    name: "Agentic AI",
    price: "from $99 / station / mo",
    blurb:
      "Metered or per-seat agent runs for copy, production, scheduling and compliance.",
  },
  {
    name: "Extra streams & seats",
    price: "à la carte",
    blurb: "Additional streams, restream destinations and CRM seats.",
  },
] as const satisfies readonly AddOn[];

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
