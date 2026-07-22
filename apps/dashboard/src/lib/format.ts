/** Shared pure formatters for the control-plane UI. */

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter((part): part is string => Boolean(part)).join(" ");
}

const FEATURE_LABELS = new Map<string, string>([
  ["record_pool", "Record pool"],
  ["eas", "EAS"],
  ["dsp", "DSP"],
  ["agentic_ai", "Agentic AI"],
]);

export function prettyFeature(key: string): string {
  const known = FEATURE_LABELS.get(key);
  if (known !== undefined) return known;
  return key
    .split(/[_\s]+/)
    .filter((word) => word.length > 0)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/** Feature keys whose flag is true. */
export function activeFeatures(
  features: Record<string, boolean> | undefined,
): string[] {
  if (features === undefined) return [];
  return Object.entries(features)
    .filter(([, value]) => value === true)
    .map(([key]) => key);
}

/** "FM · 104.5" — drops either half if missing. */
export function bandFrequency(
  band: string | null,
  frequency: string | null,
): string | null {
  const parts = [band, frequency].filter(
    (part): part is string => part !== null && part.length > 0,
  );
  return parts.length > 0 ? parts.join(" · ") : null;
}
