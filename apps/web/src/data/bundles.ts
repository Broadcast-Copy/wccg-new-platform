export interface AdBundle {
  id: string;
  name: string;
  spotCount: number;
  price: number;
  savings?: string;
  description: string;
  features: string[];
  isPopular?: boolean;
  ctaText: string;
}

export const AD_BUNDLES: AdBundle[] = [
  {
    id: "starter",
    name: "Starter",
    spotCount: 10,
    price: 500,
    description: "Perfect for local businesses",
    features: [
      "10 radio ad spots",
      "Standard rotation scheduling",
      "Basic analytics dashboard",
      "Email support",
    ],
    ctaText: "Contact Sales",
  },
  {
    id: "growth",
    name: "Growth",
    spotCount: 25,
    price: 1100,
    savings: "Save 12%",
    description: "Most Popular",
    features: [
      "25 radio ad spots",
      "Prime-time rotation scheduling",
      "Free sponsored reward placement",
      "Advanced analytics dashboard",
      "Dedicated account manager",
    ],
    isPopular: true,
    ctaText: "Contact Sales",
  },
  {
    id: "premium",
    name: "Premium",
    spotCount: 50,
    price: 2000,
    savings: "Save 20%",
    description: "Best Value",
    features: [
      "50 radio ad spots",
      "Priority rotation scheduling",
      "Sponsored reward placement",
      "Sponsored multiplier hour",
      "Full analytics suite",
      "Dedicated account manager",
      "Custom campaign strategy",
    ],
    ctaText: "Contact Sales",
  },
];
