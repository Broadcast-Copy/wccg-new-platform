/**
 * Share utilities — Web Share API with clipboard fallback + UTM tracking
 */

const BASE_URL = "https://app.wccg1045fm.com";

interface ShareOptions {
  title: string;
  text: string;
  url: string;
}

/**
 * Share content using the Web Share API, falling back to clipboard copy.
 * Returns true if shared/copied successfully.
 */
export async function shareContent(options: ShareOptions): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share(options);
      return true;
    } catch (err) {
      // User cancelled or share failed — fall through to clipboard
      if ((err as Error)?.name === "AbortError") return false;
    }
  }

  // Fallback: copy URL to clipboard
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(options.url);
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Generate a full URL with UTM parameters for tracking.
 */
export function getShareUrl(
  path: string,
  source: string = "share",
  medium: string = "social",
  campaign?: string,
): string {
  const url = new URL(path, BASE_URL);
  url.searchParams.set("utm_source", source);
  url.searchParams.set("utm_medium", medium);
  if (campaign) url.searchParams.set("utm_campaign", campaign);
  return url.toString();
}

/**
 * Generate share text for different content types.
 */
export function generateShareText(
  type: "playlist" | "contest" | "school" | "referral" | "general",
  data?: { name?: string; prize?: string },
): { title: string; text: string } {
  switch (type) {
    case "playlist":
      return {
        title: `${data?.name || "My Playlist"} on WCCG 104.5 FM`,
        text: `Check out my playlist "${data?.name || "My Playlist"}" on WCCG 104.5 FM! 🎵`,
      };
    case "contest":
      return {
        title: "I Won on WCCG 104.5 FM!",
        text: `I just won ${data?.prize || "a prize"} on WCCG 104.5 FM! 🎉`,
      };
    case "school":
      return {
        title: `${data?.name || "My School"} on WCCG 104.5 FM`,
        text: `Listen to WCCG 104.5 FM with ${data?.name || "us"}! Join your school's listening crew 🎧`,
      };
    case "referral":
      return {
        title: "Join me on WCCG 104.5 FM",
        text: "Join me on WCCG 104.5 FM and earn points for listening! Sign up free 🔥",
      };
    default:
      return {
        title: "WCCG 104.5 FM — The Hip Hop Station",
        text: "Check out WCCG 104.5 FM — Fayetteville's Hip Hop Station! 📻",
      };
  }
}
