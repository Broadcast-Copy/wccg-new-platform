export interface KeywordContest {
  id: string;
  keyword: string;
  pointsValue: number;
  prizeName?: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  hint?: string;
}

export const KEYWORDS: KeywordContest[] = [
  {
    id: "kw01",
    keyword: "WCCG104",
    pointsValue: 50,
    prizeName: undefined,
    startTime: "2026-03-14T08:00:00Z",
    endTime: "2026-03-14T23:59:59Z",
    isActive: true,
    hint: "Our station name + frequency",
  },
  {
    id: "kw02",
    keyword: "MIXXSQUADD",
    pointsValue: 100,
    prizeName: "$25 Gift Card Drawing Entry",
    startTime: "2026-03-14T12:00:00Z",
    endTime: "2026-03-15T12:00:00Z",
    isActive: true,
    hint: "Our legendary DJ crew",
  },
  {
    id: "kw03",
    keyword: "SPRINGJAM",
    pointsValue: 75,
    prizeName: undefined,
    startTime: "2026-03-07T08:00:00Z",
    endTime: "2026-03-07T23:59:59Z",
    isActive: false,
  },
  {
    id: "kw04",
    keyword: "STREETZ",
    pointsValue: 25,
    prizeName: undefined,
    startTime: "2026-03-05T06:00:00Z",
    endTime: "2026-03-05T10:00:00Z",
    isActive: false,
  },
  {
    id: "kw05",
    keyword: "LOVESONGS",
    pointsValue: 50,
    prizeName: "Dinner for Two Drawing",
    startTime: "2026-02-14T18:00:00Z",
    endTime: "2026-02-14T23:59:59Z",
    isActive: false,
  },
];
