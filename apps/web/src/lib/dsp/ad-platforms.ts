/**
 * WCCG DSP — Ad Platform Integration Service
 *
 * Stubs for every external ad platform the DSP can distribute to.
 * Each platform exposes: createCampaign, pauseCampaign, getCampaignStats, syncAudience
 *
 * WCCG own inventory is always connected; external platforms require API keys.
 */

// ──────────────────────────── Types ────────────────────────────

export interface PlatformConfig {
  apiKey?: string;
  accountId?: string;
  isConnected: boolean;
}

export interface CampaignPayload {
  name: string;
  objective: string;
  budget: number;
  startDate: string;
  endDate: string;
  targeting: {
    locations: string[];
    ageRange: string[];
    interests: string[];
    gender: string;
  };
  creatives: {
    headline?: string;
    body?: string;
    imageUrl?: string;
    videoUrl?: string;
    ctaText?: string;
  };
}

export interface PlatformStats {
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  reach: number;
}

// ──────────────────────────── Meta (Facebook / Instagram) ────────────────────────────

export const metaAds = {
  isConnected: () => !!process.env.NEXT_PUBLIC_META_ACCESS_TOKEN,

  createCampaign: async (payload: CampaignPayload): Promise<string> => {
    // TODO: Implement Meta Marketing API
    // POST https://graph.facebook.com/v19.0/act_{AD_ACCOUNT_ID}/campaigns
    console.log("[Meta] Would create campaign:", payload.name);
    return `meta_campaign_${Date.now()}`;
  },

  pauseCampaign: async (campaignId: string): Promise<boolean> => {
    // TODO: POST https://graph.facebook.com/v19.0/{campaignId} { status: 'PAUSED' }
    console.log("[Meta] Would pause campaign:", campaignId);
    return true;
  },

  getStats: async (campaignId: string): Promise<PlatformStats> => {
    // TODO: GET https://graph.facebook.com/v19.0/{campaignId}/insights
    console.log("[Meta] Would fetch stats for:", campaignId);
    return { impressions: 0, clicks: 0, conversions: 0, spend: 0, reach: 0 };
  },

  syncAudience: async (segmentData: any): Promise<string> => {
    // TODO: Create Custom Audience via Meta API
    console.log("[Meta] Would sync audience segment");
    return `meta_audience_${Date.now()}`;
  },
};

// ──────────────────────────── TikTok ────────────────────────────

export const tiktokAds = {
  isConnected: () => !!process.env.NEXT_PUBLIC_TIKTOK_ACCESS_TOKEN,

  createCampaign: async (payload: CampaignPayload): Promise<string> => {
    // TODO: POST https://business-api.tiktok.com/open_api/v1.3/campaign/create/
    console.log("[TikTok] Would create campaign:", payload.name);
    return `tiktok_campaign_${Date.now()}`;
  },

  pauseCampaign: async (campaignId: string): Promise<boolean> => {
    // TODO: POST https://business-api.tiktok.com/open_api/v1.3/campaign/update/status/
    console.log("[TikTok] Would pause campaign:", campaignId);
    return true;
  },

  getStats: async (campaignId: string): Promise<PlatformStats> => {
    // TODO: GET https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/
    console.log("[TikTok] Would fetch stats for:", campaignId);
    return { impressions: 0, clicks: 0, conversions: 0, spend: 0, reach: 0 };
  },

  syncAudience: async (segmentData: any): Promise<string> => {
    // TODO: POST https://business-api.tiktok.com/open_api/v1.3/dmp/custom_audience/create/
    console.log("[TikTok] Would sync audience segment");
    return `tiktok_audience_${Date.now()}`;
  },
};

// ──────────────────────────── Google Ads ────────────────────────────

export const googleAds = {
  isConnected: () => !!process.env.NEXT_PUBLIC_GOOGLE_ADS_TOKEN,

  createCampaign: async (payload: CampaignPayload): Promise<string> => {
    // TODO: Google Ads API v15 — CampaignService.MutateCampaigns
    console.log("[Google] Would create campaign:", payload.name);
    return `google_campaign_${Date.now()}`;
  },

  pauseCampaign: async (campaignId: string): Promise<boolean> => {
    // TODO: Google Ads API — set status to PAUSED
    console.log("[Google] Would pause campaign:", campaignId);
    return true;
  },

  getStats: async (campaignId: string): Promise<PlatformStats> => {
    // TODO: Google Ads API — GoogleAdsService.SearchStream
    console.log("[Google] Would fetch stats for:", campaignId);
    return { impressions: 0, clicks: 0, conversions: 0, spend: 0, reach: 0 };
  },

  syncAudience: async (segmentData: any): Promise<string> => {
    // TODO: Google Ads API — UserListService
    console.log("[Google] Would sync audience segment");
    return `google_audience_${Date.now()}`;
  },
};

// ──────────────────────────── Snapchat ────────────────────────────

export const snapchatAds = {
  isConnected: () => !!process.env.NEXT_PUBLIC_SNAPCHAT_ACCESS_TOKEN,

  createCampaign: async (payload: CampaignPayload): Promise<string> => {
    // TODO: POST https://adsapi.snapchat.com/v1/adaccounts/{ad_account_id}/campaigns
    console.log("[Snapchat] Would create campaign:", payload.name);
    return `snap_campaign_${Date.now()}`;
  },

  pauseCampaign: async (campaignId: string): Promise<boolean> => {
    // TODO: PUT https://adsapi.snapchat.com/v1/campaigns/{campaignId} { status: 'PAUSED' }
    console.log("[Snapchat] Would pause campaign:", campaignId);
    return true;
  },

  getStats: async (campaignId: string): Promise<PlatformStats> => {
    // TODO: GET https://adsapi.snapchat.com/v1/campaigns/{campaignId}/stats
    console.log("[Snapchat] Would fetch stats for:", campaignId);
    return { impressions: 0, clicks: 0, conversions: 0, spend: 0, reach: 0 };
  },

  syncAudience: async (segmentData: any): Promise<string> => {
    // TODO: POST https://adsapi.snapchat.com/v1/adaccounts/{id}/segments
    console.log("[Snapchat] Would sync audience segment");
    return `snap_audience_${Date.now()}`;
  },
};

// ──────────────────────────── WCCG Own Inventory (always connected) ────────────────────────────

export const wccgAds = {
  isConnected: () => true,

  createCampaign: async (payload: CampaignPayload): Promise<string> => {
    console.log("[WCCG] Campaign created:", payload.name);
    return `wccg_campaign_${Date.now()}`;
  },

  pauseCampaign: async (campaignId: string): Promise<boolean> => {
    console.log("[WCCG] Campaign paused:", campaignId);
    return true;
  },

  getStats: async (campaignId: string): Promise<PlatformStats> => {
    // TODO: Query from dsp_analytics table
    console.log("[WCCG] Would fetch stats for:", campaignId);
    return { impressions: 0, clicks: 0, conversions: 0, spend: 0, reach: 0 };
  },

  syncAudience: async (segmentData: any): Promise<string> => {
    console.log("[WCCG] Audience synced to own inventory");
    return `wccg_audience_${Date.now()}`;
  },
};

// ──────────────────────────── Budget Allocator ────────────────────────────

/**
 * Distributes a total budget across selected channels.
 *
 * - `auto` mode: weighted allocation that favors owned inventory.
 * - `manual` mode: distributes proportionally based on supplied splits.
 */
export function allocateBudget(
  totalBudget: number,
  channels: string[],
  mode: "auto" | "manual",
  manualSplits?: Record<string, number>,
): Record<string, number> {
  if (mode === "manual" && manualSplits) {
    const total = Object.values(manualSplits).reduce((a, b) => a + b, 0);
    if (total === 0) return {};
    const result: Record<string, number> = {};
    for (const ch of channels) {
      result[ch] =
        Math.round((totalBudget * ((manualSplits[ch] || 0) / total)) * 100) /
        100;
    }
    return result;
  }

  // Auto: weighted allocation favoring owned inventory
  const weights: Record<string, number> = {
    wccg_onair: 3,
    wccg_digital: 2,
    wccg_hubs: 1,
    facebook: 2,
    tiktok: 2,
    google: 2,
    snapchat: 1,
  };

  const activeWeights = channels.map((ch) => weights[ch] || 1);
  const totalWeight = activeWeights.reduce((a, b) => a + b, 0);
  if (totalWeight === 0) return {};

  const result: Record<string, number> = {};
  channels.forEach((ch, i) => {
    result[ch] =
      Math.round(((totalBudget * activeWeights[i]) / totalWeight) * 100) / 100;
  });
  return result;
}

// ──────────────────────────── Platform Status ────────────────────────────

/** Returns a map of every channel to its connection status. */
export function getPlatformStatus(): Record<string, boolean> {
  return {
    wccg_onair: true,
    wccg_digital: true,
    wccg_hubs: true,
    facebook: metaAds.isConnected(),
    tiktok: tiktokAds.isConnected(),
    google: googleAds.isConnected(),
    snapchat: snapchatAds.isConnected(),
  };
}
