/**
 * The product animations - short loops of the REAL Production-app screens
 * (made with Remotion in dev/bc-product-animations, private data blurred).
 * They live in the public `marketing` storage bucket under clips/product/,
 * NOT in this repository (2026-09-27: ~33 MB per render would grow the repo's
 * history with every re-render). File names are stable on purpose: the
 * members-only docs reuse them by name. Each name has <name>.webm, .mp4,
 * .jpg (poster) and .vtt (captions) in that folder.
 */

const PRODUCT_MEDIA_BASE = (
  process.env.NEXT_PUBLIC_PRODUCT_MEDIA_BASE ||
  "https://irjiqbmoohklagdegezz.supabase.co/storage/v1/object/public/marketing/clips/product/"
).replace(/\/*$/, "/");

/** Where one of a video's files lives: its name plus webm, mp4, jpg or vtt. */
export function productMediaUrl(name: ProductVideoName, ext: "webm" | "mp4" | "jpg" | "vtt"): string {
  return `${PRODUCT_MEDIA_BASE}${name}.${ext}`;
}

export type ProductVideoName =
  | "build-a-days-log"
  | "log-editor-revalidate"
  | "imaging-ai-writer"
  | "traffic-build-week"
  | "vt-editor"
  | "guide-panel"
  | "tour"
  | "tour-vertical";

export type ProductVideoInfo = {
  readonly name: ProductVideoName;
  readonly title: string;
  /** one line for the page */
  readonly blurb: string;
  /** what happens in the video, for the accessible name */
  readonly label: string;
  readonly seconds: number;
  readonly width: number;
  readonly height: number;
  /** shows a feature the station switches on (the AI writer, traffic publishing) */
  readonly optionalNote?: string;
};

export const LOOPS = [
  {
    name: "build-a-days-log",
    title: "Build a day's log",
    blurb:
      "Generate tomorrow's log, run it through six checks that replay every hour, and publish it as a numbered revision — only if nothing fails.",
    label:
      "Animated real screens of Tomorrow's log in the Production app: Generate tomorrow now is pressed and confirmed, the six checks pass, the day publishes as revision r1, and a day that fails a check is shown not published.",
    seconds: 13,
    width: 1280,
    height: 720,
  },
  {
    name: "log-editor-revalidate",
    title: "PD edits in the Log Editor",
    blurb:
      "A signed-in edit with a reason, a revenue confirmation before a paid spot comes out, an append-only change record — and the day validated again.",
    label:
      "Animated real screens of the Log Editor: a program director types a reason, selects a paid spot and gets a revenue confirmation naming its booking and make-good, the change appears in the append-only record, and Validate now shows the day passing.",
    seconds: 13,
    width: 1280,
    height: 720,
  },
  {
    name: "imaging-ai-writer",
    title: "Imaging with the AI script writer",
    blurb:
      "Pick a type and an occasion, ask for drafts, see CHECK flags on anything that may be invented, and save the one you want.",
    label:
      "Animated real screens of Imaging, Create and schedule: Sweeper and Halloween are chosen, the AI writer is asked for three spooky ten-second drafts, a CHECK flag marks a draft that names a day, Use this puts a draft in the script box and Create item saves it.",
    seconds: 13,
    width: 1280,
    height: 720,
    optionalNote: "The AI writer is optional and works once your station turns it on.",
  },
  {
    name: "traffic-build-week",
    title: "Traffic: build the week",
    blurb:
      "Avails straight from your clocks, orders planned with oversell refused by name, and the week staged and compared line by line.",
    label:
      "Animated real screens of Traffic, Build Traffic: the week's avails from the programming clocks, planning the orders to place with one refused for overselling, staging the week's seven day files, and publishing shown switched off.",
    seconds: 13,
    width: 1280,
    height: 720,
    optionalNote: "Publishing to the log stays off until your station switches it on.",
  },
  {
    name: "vt-editor",
    title: "Voice-tracking in the VT editor",
    blurb:
      "Open a junction, hear both records, record over the segue, set the duck and fade, and place the take on the slot.",
    label:
      "Animated real screens of the VT and segue editor: a junction in the day's log is opened, the take is recorded with the Space key and the segue marked with M, the music duck and out fade are shown, and the take is placed on the slot.",
    seconds: 12,
    width: 1280,
    height: 720,
  },
  {
    name: "guide-panel",
    title: "A guide on every page",
    blurb:
      "The Guide button or F1 opens a walkthrough for the page you are on — what it does to air, the steps in order, and Show me.",
    label:
      "Animated real screens of the Guide panel: the guide for the Log Editor says what the page does to air and lists numbered steps, Show me highlights the real control, and the Holds and promotions calendar pages show their own guides.",
    seconds: 13,
    width: 1280,
    height: 720,
  },
] as const satisfies readonly ProductVideoInfo[];

export const TOUR_VIDEO = {
  name: "tour",
  title: "The product tour",
  blurb: "The best moments of all six, in one cut.",
  label:
    "A product tour of the Broadcast Copy production app, using real screens: building and publishing a day's log, a program director's edit in the Log Editor, imaging drafts from the optional AI writer, planning the traffic week, recording a voice track, and the Guide panel.",
  seconds: 29,
  width: 1280,
  height: 720,
} as const satisfies ProductVideoInfo;

export const TOUR_VERTICAL = {
  name: "tour-vertical",
  title: "The product tour (vertical)",
  blurb: "The tour cut at 9:16, for social.",
  label: TOUR_VIDEO.label,
  seconds: 30,
  width: 1080,
  height: 1920,
} as const satisfies ProductVideoInfo;
