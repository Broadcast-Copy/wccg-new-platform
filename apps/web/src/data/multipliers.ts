export interface MultiplierWindow {
  id: string;
  multiplier: number;
  startHour: number;
  endHour: number;
  days: string[];
  sponsorName?: string;
  sponsorLogo?: string;
  label: string;
}

export const MULTIPLIER_SCHEDULE: MultiplierWindow[] = [
  {
    id: "morning_rush",
    multiplier: 2,
    startHour: 7,
    endHour: 9,
    days: ["mon", "tue", "wed", "thu", "fri"],
    sponsorName: "McDonald's",
    label: "McDonald's Morning Rush",
  },
  {
    id: "lunch_boost",
    multiplier: 3,
    startHour: 12,
    endHour: 13,
    days: ["mon", "tue", "wed", "thu", "fri"],
    label: "Lunch Hour Boost",
  },
  {
    id: "drive_time",
    multiplier: 2,
    startHour: 17,
    endHour: 19,
    days: ["mon", "tue", "wed", "thu", "fri"],
    sponsorName: "AutoZone",
    label: "AutoZone Drive Time",
  },
  {
    id: "friday_night",
    multiplier: 5,
    startHour: 20,
    endHour: 23,
    days: ["fri"],
    sponsorName: "Crown Complex",
    label: "Friday Night 5x!",
  },
  {
    id: "weekend_vibes",
    multiplier: 2,
    startHour: 10,
    endHour: 14,
    days: ["sat", "sun"],
    label: "Weekend Vibes",
  },
];
