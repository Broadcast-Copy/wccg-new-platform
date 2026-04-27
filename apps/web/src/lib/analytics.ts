"use client";

/**
 * Funnel analytics — Phase A9.
 *
 * Vendor-neutral wrapper. Uses PostHog when NEXT_PUBLIC_POSTHOG_KEY is set;
 * otherwise it's a tiny no-op + console.debug so dev sessions don't 404.
 *
 * Schema is intentionally tiny — we measure listenership and engagement, not
 * everything-and-the-kitchen-sink. Adding events here is a deliberate act.
 */

type EventName =
  | "visit_home"
  | "play_clicked"
  | "audio_first_byte"
  | "audio_listen_minute"
  | "point_awarded"
  | "daily_check_in"
  | "signup_completed"
  | "wiki_viewed"
  | "place_check_in"
  | "marketplace_view"
  | "newsletter_subscribed"
  | "push_opt_in";

interface PostHog {
  init: (key: string, opts: Record<string, unknown>) => void;
  capture: (name: string, props?: Record<string, unknown>) => void;
  identify: (userId: string, props?: Record<string, unknown>) => void;
}

let phPromise: Promise<PostHog | null> | null = null;

async function ph(): Promise<PostHog | null> {
  if (typeof window === "undefined") return null;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  if (phPromise) return phPromise;

  phPromise = (async () => {
    try {
      // Dynamic import — keeps PostHog out of the main bundle when unused.
      const mod = await import(/* webpackIgnore: true */ "posthog-js" as string).catch(() => null);
      if (!mod || !mod.default) return null;
      const inst = mod.default as PostHog;
      inst.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
        capture_pageview: false, // we capture visit_home explicitly
        persistence: "localStorage+cookie",
        autocapture: false, // be deliberate about events
      });
      return inst;
    } catch {
      return null;
    }
  })();

  return phPromise;
}

export async function track(name: EventName, props?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const inst = await ph();
  if (inst) {
    inst.capture(name, props);
  } else if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.debug(`[analytics] ${name}`, props ?? {});
  }
}

export async function identify(userId: string, props?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const inst = await ph();
  if (inst) inst.identify(userId, props);
}
