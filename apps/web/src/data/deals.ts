export interface Deal {
  id: string;
  businessName: string;
  offer: string;
  description: string;
  lat: number;
  lng: number;
  category: string;
  icon: string;
  nearbyThresholdMeters: number;
  expiresAt: string;
}

export const DEALS: Deal[] = [
  {
    id: "deal_biscuitville",
    businessName: "Biscuitville",
    offer: "Free biscuit with any drink",
    description: "Show this offer at any Fayetteville Biscuitville location. One per customer per visit.",
    lat: 35.0612,
    lng: -78.8832,
    category: "Food",
    icon: "\uD83E\uDD50",
    nearbyThresholdMeters: 1000,
    expiresAt: "2026-12-31",
  },
  {
    id: "deal_golden_corral",
    businessName: "Golden Corral",
    offer: "10% off buffet",
    description: "Present this offer to your server before ordering. Cannot be combined with other discounts.",
    lat: 35.0489,
    lng: -78.9156,
    category: "Food",
    icon: "\uD83C\uDF7D\uFE0F",
    nearbyThresholdMeters: 1000,
    expiresAt: "2026-12-31",
  },
  {
    id: "deal_supreme_cuts",
    businessName: "Supreme Cuts Barbershop",
    offer: "$5 off any cut",
    description: "Show this screen to your barber. Walk-ins welcome. Valid at Fayetteville location only.",
    lat: 35.0553,
    lng: -78.8901,
    category: "Services",
    icon: "\u2702\uFE0F",
    nearbyThresholdMeters: 1000,
    expiresAt: "2026-12-31",
  },
  {
    id: "deal_auto_wash",
    businessName: "Fayetteville Auto Wash",
    offer: "Free interior vacuum",
    description: "Free interior vacuum with any wash purchase. Show this offer at the counter.",
    lat: 35.0634,
    lng: -78.8745,
    category: "Auto",
    icon: "\uD83D\uDE97",
    nearbyThresholdMeters: 1000,
    expiresAt: "2026-12-31",
  },
  {
    id: "deal_tropical_smoothie",
    businessName: "Tropical Smoothie Cafe",
    offer: "BOGO smoothies",
    description: "Buy one smoothie, get one free. Must mention WCCG at checkout. One per customer.",
    lat: 35.0478,
    lng: -78.9023,
    category: "Food",
    icon: "\uD83E\uDD64",
    nearbyThresholdMeters: 1000,
    expiresAt: "2026-12-31",
  },
  {
    id: "deal_kings_beauty",
    businessName: "King's Beauty Supply",
    offer: "15% off products",
    description: "15% off any in-store purchase. Show this offer at checkout. Excludes sale items.",
    lat: 35.0521,
    lng: -78.8867,
    category: "Beauty",
    icon: "\uD83D\uDC85",
    nearbyThresholdMeters: 1000,
    expiresAt: "2026-12-31",
  },
  {
    id: "deal_amf_lanes",
    businessName: "AMF Lanes",
    offer: "Free shoe rental",
    description: "Free shoe rental with paid bowling game. Show this screen at the counter.",
    lat: 35.0712,
    lng: -78.9234,
    category: "Entertainment",
    icon: "\uD83C\uDFB3",
    nearbyThresholdMeters: 1000,
    expiresAt: "2026-12-31",
  },
  {
    id: "deal_quick_stop",
    businessName: "Quick Stop Gas",
    offer: "10\u00A2 off per gallon",
    description: "Save 10 cents per gallon on fuel. Show this screen to the attendant before pumping.",
    lat: 35.0398,
    lng: -78.8956,
    category: "Auto",
    icon: "\u26FD",
    nearbyThresholdMeters: 1000,
    expiresAt: "2026-12-31",
  },
];
