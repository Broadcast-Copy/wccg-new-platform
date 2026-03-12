// ---------------------------------------------------------------------------
// Campaign Builder — Form schema, types, and step definitions
// ---------------------------------------------------------------------------

import { z } from "zod/v4";

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const breakSlotSchema = z.object({
  hour: z.number(),
  break18: z.boolean(),
  break48: z.boolean(),
});

const daypartOrderSchema = z.object({
  daypartId: z.string(),
  dayCategory: z.enum(["weekday", "saturday", "sunday"]),
  showName: z.string(),
  rate: z.number().min(0),
  spotLength: z.union([z.literal(15), z.literal(30), z.literal(60)]),
  orderType: z.enum(["specific", "non_specific"]),
  spotsPerWeek: z.number().min(0),
  breakSlots: z.array(breakSlotSchema),
});

const creativeSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["audio_15s", "audio_30s", "audio_60s", "banner", "video"]),
  fileUrl: z.string(),
  status: z.enum(["draft", "ready", "approved"]),
});

// ---------------------------------------------------------------------------
// Flight variation schema — combines flight dates + order config into one tile
// ---------------------------------------------------------------------------

const flightVariationSchema = z.object({
  id: z.string(),
  label: z.string(),
  dayType: z.enum(["weekday", "saturday", "sunday", "sports"]),
  flightStart: z.string(),
  flightEnd: z.string(),
  // On-air daypart orders specific to this flight
  daypartOrders: z.array(daypartOrderSchema),
  // Promotions-specific fields for this flight variation
  promotionDaypartId: z.string(),
  promotionTimeSlot: z.string(),
});

// ---------------------------------------------------------------------------
// Main campaign form schema
// ---------------------------------------------------------------------------

export const campaignFormSchema = z.object({
  // Step 1: Campaign type
  campaignType: z.enum(["on_air", "digital", "remote_broadcast", "promotions", "sports_sponsorship"]),

  // Step 2: Client
  clientId: z.string(),
  clientName: z.string(),

  // Step 3: Schedule
  campaignName: z.string().min(1, "Campaign name is required"),
  flightStart: z.string().min(1, "Start date is required"),
  flightEnd: z.string().min(1, "End date is required"),

  // Flight variations — each tile has its own dates + day type + order config
  flightVariations: z.array(flightVariationSchema),

  // On-air specific (legacy / global)
  selectedDays: z.array(z.enum(["weekday", "saturday", "sunday"])),
  daypartOrders: z.array(daypartOrderSchema),
  includeMixShows: z.boolean(),
  mixShowSelections: z.array(z.string()),

  // Remote broadcast specific
  remotePackageId: z.string(),
  remoteIncludePersonality: z.boolean(),
  remoteIncludeDj: z.boolean(),

  // Sports specific
  sportType: z.string(),
  sportsPackages: z.array(z.string()),

  // Digital specific
  digitalPlacements: z.array(z.string()),
  digitalBudget: z.number(),

  // Promotions specific
  promotionType: z.string(),
  promotionDescription: z.string(),
  promotionRate: z.number().min(0),

  // Step 4: Creative
  creatives: z.array(creativeSchema),

  // Step 5: Review
  taxRate: z.number().min(0).max(100),
  notes: z.string(),
});

export type CampaignFormValues = z.infer<typeof campaignFormSchema>;

export type DaypartOrderValues = z.infer<typeof daypartOrderSchema>;
export type BreakSlotValues = z.infer<typeof breakSlotSchema>;
export type CreativeValues = z.infer<typeof creativeSchema>;
export type FlightVariationValues = z.infer<typeof flightVariationSchema>;

// ---------------------------------------------------------------------------
// Day type for flight tiles
// ---------------------------------------------------------------------------

export type DayType = "weekday" | "saturday" | "sunday" | "sports";

export const DAY_TYPE_LABELS: Record<DayType, string> = {
  weekday: "Weekday (Mon-Fri)",
  saturday: "Saturday",
  sunday: "Sunday",
  sports: "Sports",
};

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------

export const STEP_LABELS = [
  "Campaign Type",
  "Client",
  "Schedule & Spots",
  "Audio / Creative",
  "Review & Invoice",
];

// Fields to validate per step (partial — step 3 is conditional on type)
export const STEP_FIELDS: Record<number, (keyof CampaignFormValues)[]> = {
  0: ["campaignType"],
  1: ["clientId"],
  2: ["campaignName", "flightStart", "flightEnd"],
  3: [], // creative is optional
  4: [], // review — no validation needed
};

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_FORM_VALUES: CampaignFormValues = {
  campaignType: "on_air",
  clientId: "",
  clientName: "",
  campaignName: "",
  flightStart: "",
  flightEnd: "",
  flightVariations: [],
  selectedDays: ["weekday"],
  daypartOrders: [],
  includeMixShows: false,
  mixShowSelections: [],
  remotePackageId: "",
  remoteIncludePersonality: true,
  remoteIncludeDj: false,
  sportType: "",
  sportsPackages: [],
  digitalPlacements: [],
  digitalBudget: 0,
  promotionType: "",
  promotionDescription: "",
  promotionRate: 150,
  creatives: [],
  taxRate: 7,
  notes: "",
};
