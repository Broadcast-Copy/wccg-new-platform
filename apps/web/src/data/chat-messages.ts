/**
 * Mock chat messages for the live chat feature.
 * 20 messages from various "listeners" with realistic names and messages.
 */

export interface MockChatMessage {
  id: string;
  displayName: string;
  message: string;
  minutesAgo: number;
  isFeatured: boolean;
}

export const MOCK_CHAT_MESSAGES: MockChatMessage[] = [
  {
    id: "mock_1",
    displayName: "DJ_QueenB",
    message: "This song is FIRE right now!! WCCG always coming through with the heat",
    minutesAgo: 28,
    isFeatured: false,
  },
  {
    id: "mock_2",
    displayName: "FayettevilleFresh",
    message: "Shoutout to everybody tuning in from the 910! We out here",
    minutesAgo: 26,
    isFeatured: false,
  },
  {
    id: "mock_3",
    displayName: "CarolinaKing_",
    message: "Can we get some Usher next? Throwback vibes please!",
    minutesAgo: 24,
    isFeatured: true,
  },
  {
    id: "mock_4",
    displayName: "MelodyMaven",
    message: "Just got off work and this is exactly what I needed. Best station in NC hands down",
    minutesAgo: 22,
    isFeatured: false,
  },
  {
    id: "mock_5",
    displayName: "TrapSoul_Mike",
    message: "That last mix was insane, whoever on the boards rn is killing it",
    minutesAgo: 20,
    isFeatured: false,
  },
  {
    id: "mock_6",
    displayName: "RealTalkRachel",
    message: "I love how WCCG keeps it real with the community. Y'all are the heartbeat of Fayetteville",
    minutesAgo: 18,
    isFeatured: false,
  },
  {
    id: "mock_7",
    displayName: "BassDropBenny",
    message: "Turn it UP!! My neighbors gonna have to deal with it today lol",
    minutesAgo: 17,
    isFeatured: false,
  },
  {
    id: "mock_8",
    displayName: "SmoothVibes_T",
    message: "Been listening since 6am, can't stop won't stop. 104.5 all day",
    minutesAgo: 15,
    isFeatured: true,
  },
  {
    id: "mock_9",
    displayName: "NCBornNRaised",
    message: "Anybody else streaming from out of state? Repping NC from ATL right now!",
    minutesAgo: 14,
    isFeatured: false,
  },
  {
    id: "mock_10",
    displayName: "VibeCheckVicky",
    message: "The vibe check is PASSED. This playlist is immaculate today",
    minutesAgo: 12,
    isFeatured: false,
  },
  {
    id: "mock_11",
    displayName: "910Soldier",
    message: "Fort Liberty in the building! Shoutout to all the military fam listening rn",
    minutesAgo: 11,
    isFeatured: false,
  },
  {
    id: "mock_12",
    displayName: "MixMasterMia",
    message: "Can we get a moment of appreciation for the DJs on this station? Transitions are SMOOTH",
    minutesAgo: 9,
    isFeatured: false,
  },
  {
    id: "mock_13",
    displayName: "OldSchoolOtis",
    message: "Y'all play some Outkast and I'll be happy for the rest of the week fr",
    minutesAgo: 8,
    isFeatured: false,
  },
  {
    id: "mock_14",
    displayName: "NewWavNia",
    message: "Just discovered this station through the app and I'm hooked! The points system is genius too",
    minutesAgo: 7,
    isFeatured: false,
  },
  {
    id: "mock_15",
    displayName: "CharlotteChas",
    message: "Driving down I-95 and WCCG is the only thing keeping me awake. Bless y'all",
    minutesAgo: 6,
    isFeatured: true,
  },
  {
    id: "mock_16",
    displayName: "BeatsByBrandon",
    message: "That beat switch was CRAZY. Produced by who??? I need to know",
    minutesAgo: 5,
    isFeatured: false,
  },
  {
    id: "mock_17",
    displayName: "SoulSisterSam",
    message: "This R&B set is giving me all the feels right now. Perfect for this weather",
    minutesAgo: 4,
    isFeatured: false,
  },
  {
    id: "mock_18",
    displayName: "DurhamDave",
    message: "Just hit 500 listening points! This app is addicting in the best way",
    minutesAgo: 3,
    isFeatured: false,
  },
  {
    id: "mock_19",
    displayName: "QueenCity_Jazz",
    message: "Happy Friday y'all! Who's going out tonight? The DJ better drop the playlist",
    minutesAgo: 2,
    isFeatured: false,
  },
  {
    id: "mock_20",
    displayName: "LitLarry910",
    message: "WCCG 104.5 the GOAT station no debate. Been rocking with y'all for 10+ years",
    minutesAgo: 1,
    isFeatured: false,
  },
];

/**
 * Get mock messages with computed timestamps relative to now.
 */
export function getMockMessages(): Array<{
  id: string;
  displayName: string;
  message: string;
  timestamp: string;
  isFeatured: boolean;
  isOwn: false;
}> {
  const now = Date.now();
  return MOCK_CHAT_MESSAGES.map((m) => ({
    id: m.id,
    displayName: m.displayName,
    message: m.message,
    timestamp: new Date(now - m.minutesAgo * 60 * 1000).toISOString(),
    isFeatured: m.isFeatured,
    isOwn: false as const,
  }));
}
