export interface CheckInLocation {
  id: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  points: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  address: string;
}

export const CHECK_IN_LOCATIONS: CheckInLocation[] = [
  {
    id: "loc_crosscreek",
    name: "WCCG at Cross Creek Mall",
    description: "Visit the WCCG street team at Cross Creek Mall for free swag and prizes!",
    lat: 35.0365,
    lng: -78.9822,
    points: 500,
    startDate: "2026-03-01",
    endDate: "2026-12-31",
    isActive: true,
    address: "419 Cross Creek Mall, Fayetteville, NC 28303",
  },
  {
    id: "loc_festival_park",
    name: "Friday Night Concert - Festival Park",
    description: "Live music every Friday night at Festival Park. Check in for bonus points!",
    lat: 35.0527,
    lng: -78.8784,
    points: 750,
    startDate: "2026-03-01",
    endDate: "2026-12-31",
    isActive: true,
    address: "335 Ray Ave, Fayetteville, NC 28301",
  },
  {
    id: "loc_mt_pisgah",
    name: "WCCG Gospel Caravan - Mt. Pisgah",
    description: "Join the WCCG Gospel Caravan for an uplifting afternoon of praise and fellowship.",
    lat: 35.0703,
    lng: -78.9134,
    points: 500,
    startDate: "2026-03-01",
    endDate: "2026-12-31",
    isActive: true,
    address: "2640 Raeford Rd, Fayetteville, NC 28305",
  },
  {
    id: "loc_hay_street",
    name: "Food Truck Friday - Hay Street",
    description: "Food trucks, music, and community every Friday on Hay Street downtown.",
    lat: 35.0531,
    lng: -78.8789,
    points: 300,
    startDate: "2026-03-01",
    endDate: "2026-12-31",
    isActive: true,
    address: "Hay Street, Fayetteville, NC 28301",
  },
  {
    id: "loc_fort_liberty",
    name: "WCCG at Fort Liberty",
    description: "Supporting our troops! Check in at the WCCG booth near the main gate.",
    lat: 35.1368,
    lng: -79.0165,
    points: 500,
    startDate: "2026-03-01",
    endDate: "2026-12-31",
    isActive: true,
    address: "Fort Liberty, Fayetteville, NC 28310",
  },
  {
    id: "loc_rowan_block_party",
    name: "Summer Block Party - Rowan Street",
    description: "The biggest block party of the summer! DJs, food, games, and a live WCCG broadcast.",
    lat: 35.0491,
    lng: -78.8871,
    points: 1000,
    startDate: "2026-06-01",
    endDate: "2026-08-31",
    isActive: true,
    address: "Rowan Street, Fayetteville, NC 28301",
  },
];
