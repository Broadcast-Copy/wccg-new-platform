/**
 * Referral Program — localStorage-backed referral code management
 * Users share a unique code; both referrer and referee earn 500 points.
 */

import { awardCustomBounty } from "@/hooks/use-listening-points";

export interface ReferralData {
  code: string;
  referrals: Array<{ code: string; timestamp: string }>;
  referredBy: string | null;
  totalPointsEarned: number;
}

function storageKey(email: string): string {
  return `wccg_referral_${email}`;
}

/** Simple string hash function */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return hash;
}

/**
 * Generate a referral code from the user's email.
 * Format: WCCG-XXXX1234
 */
export function generateCode(email: string): string {
  const prefix = email.split("@")[0].slice(0, 4).toUpperCase();
  const suffix = Math.abs(hashCode(email)) % 10000;
  return `WCCG-${prefix}${String(suffix).padStart(4, "0")}`;
}

export function loadReferral(email: string): ReferralData {
  if (typeof window === "undefined") {
    return {
      code: generateCode(email),
      referrals: [],
      referredBy: null,
      totalPointsEarned: 0,
    };
  }
  try {
    const raw = localStorage.getItem(storageKey(email));
    if (raw) {
      const data = JSON.parse(raw) as ReferralData;
      // Ensure code is present (migration)
      if (!data.code) data.code = generateCode(email);
      return data;
    }
  } catch {
    // ignore
  }
  return {
    code: generateCode(email),
    referrals: [],
    referredBy: null,
    totalPointsEarned: 0,
  };
}

function saveReferral(email: string, data: ReferralData): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(email), JSON.stringify(data));
  } catch {
    // ignore
  }
}

/**
 * Record that the current user was referred by someone with the given code.
 * Awards 500 points to the current user.
 * Returns { success, error? }.
 */
export function recordReferral(
  email: string,
  referrerCode: string,
): { success: boolean; error?: string } {
  const myCode = generateCode(email);

  // Prevent self-referral
  if (referrerCode.toUpperCase() === myCode.toUpperCase()) {
    return { success: false, error: "You cannot use your own referral code." };
  }

  const data = loadReferral(email);

  // Check if already referred
  if (data.referredBy) {
    return { success: false, error: "You have already used a referral code." };
  }

  // Award 500 points to the referee (current user)
  const bountyId = `referral_signup_${email}_${referrerCode}`;
  const awarded = awardCustomBounty(
    bountyId,
    500,
    "REFERRAL_SIGNUP",
    "Referral Program",
  );

  if (!awarded) {
    return { success: false, error: "This referral has already been applied." };
  }

  data.referredBy = referrerCode;
  data.totalPointsEarned += 500;
  saveReferral(email, data);

  return { success: true };
}

/**
 * Get referral statistics for a user.
 */
export function getStats(email: string): {
  code: string;
  referralCount: number;
  totalPointsEarned: number;
  referredBy: string | null;
} {
  const data = loadReferral(email);
  return {
    code: data.code,
    referralCount: data.referrals.length,
    totalPointsEarned: data.totalPointsEarned,
    referredBy: data.referredBy,
  };
}

/**
 * Build a full referral URL with the user's code.
 */
export function getReferralUrl(code: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/register?ref=${code}`;
}
