interface RedemptionRecord {
  dealId: string;
  timestamp: string;
}

interface DealsData {
  redeemed: RedemptionRecord[];
}

function storageKey(email: string): string {
  return `wccg_deals_${email}`;
}

export function loadDeals(email: string): RedemptionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(email));
    if (!raw) return [];
    const data: DealsData = JSON.parse(raw);
    return data.redeemed || [];
  } catch {
    return [];
  }
}

export function hasRedeemed(email: string, dealId: string): boolean {
  const redeemed = loadDeals(email);
  return redeemed.some((r) => r.dealId === dealId);
}

export function recordRedemption(email: string, dealId: string): void {
  const redeemed = loadDeals(email);
  redeemed.push({
    dealId,
    timestamp: new Date().toISOString(),
  });
  if (typeof window !== "undefined") {
    localStorage.setItem(
      storageKey(email),
      JSON.stringify({ redeemed } satisfies DealsData),
    );
  }
}
