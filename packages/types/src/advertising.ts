export type AdCampaignStatus = 'DRAFT' | 'PENDING_REVIEW' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'REJECTED';
export type AdCreativeType = 'AUDIO_15S' | 'AUDIO_30S' | 'AUDIO_60S' | 'BANNER_LEADERBOARD' | 'BANNER_SIDEBAR' | 'SPONSORSHIP';
export type AdCreativeStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';
export type AdPlacement = 'PREROLL' | 'MIDROLL' | 'POSTROLL' | 'BANNER' | 'SPONSORSHIP';

export interface AdvertiserAccount {
  id: string;
  userId: string;
  companyName: string;
  companyWebsite: string | null;
  contactPhone: string | null;
  billingEmail: string | null;
  billingAddress: string | null;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdCampaign {
  id: string;
  advertiserId: string;
  name: string;
  description: string | null;
  status: AdCampaignStatus;
  budgetTotal: number | null;
  budgetDaily: number | null;
  spentTotal: number;
  startDate: string | null;
  endDate: string | null;
  targetGeo: string[];
  targetAgeMin: number | null;
  targetAgeMax: number | null;
  targetDayparts: string[];
  targetStreams: string[];
  frequencyCap: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdCreative {
  id: string;
  campaignId: string;
  name: string;
  creativeType: AdCreativeType;
  fileUrl: string | null;
  fileSize: number | null;
  duration: number | null;
  width: number | null;
  height: number | null;
  altText: string | null;
  clickUrl: string | null;
  status: AdCreativeStatus;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdImpression {
  id: string;
  creativeId: string;
  campaignId: string;
  streamId: string | null;
  listenerId: string | null;
  placement: AdPlacement;
  impressionAt: string;
  clicked: boolean;
  clickedAt: string | null;
}

export interface AdRateCard {
  id: string;
  name: string;
  creativeType: AdCreativeType;
  ratePerSpot: number | null;
  rateCpm: number | null;
  rateFlat: number | null;
  minCommitmentDays: number;
  description: string | null;
  isActive: boolean;
}

export interface CreateCampaignDto {
  name: string;
  description?: string;
  budgetTotal?: number;
  budgetDaily?: number;
  startDate?: string;
  endDate?: string;
  targetGeo?: string[];
  targetAgeMin?: number;
  targetAgeMax?: number;
  targetDayparts?: string[];
  targetStreams?: string[];
  frequencyCap?: number;
}

export interface UpdateCampaignDto {
  name?: string;
  description?: string;
  status?: AdCampaignStatus;
  budgetTotal?: number;
  budgetDaily?: number;
  startDate?: string;
  endDate?: string;
  targetGeo?: string[];
  targetDayparts?: string[];
  targetStreams?: string[];
  frequencyCap?: number;
}

export interface CreateCreativeDto {
  campaignId: string;
  name: string;
  creativeType: AdCreativeType;
  fileUrl?: string;
  fileSize?: number;
  duration?: number;
  width?: number;
  height?: number;
  altText?: string;
  clickUrl?: string;
}
