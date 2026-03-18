"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X } from "lucide-react";
import { useNowPlaying } from "@/hooks/use-now-playing";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { ALL_SHOWS, getDayPart } from "@/data/shows";
import { ALL_HOSTS } from "@/data/hosts";
import { DUKE_BASKETBALL, DUKE_FOOTBALL } from "@/data/sports";

interface ChatMsg {
  from: "bot" | "user";
  text: string;
}

const BOT_GREETING: ChatMsg = {
  from: "bot",
  text: "Hey! I'm the WCCG 104.5 FM assistant. Ask me anything -- what's playing now, show schedules, Duke games, host info, and more!",
};

// ── Time helpers (EST) ──────────────────────────────────────────────

function getEST(): Date {
  const now = new Date();
  const estStr = now.toLocaleString("en-US", { timeZone: "America/New_York" });
  return new Date(estStr);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

// ── What's on now ───────────────────────────────────────────────────

function getWhatsOnNow() {
  const est = getEST();
  const currentDay = est.getDay();
  const currentMinutes = est.getHours() * 60 + est.getMinutes();

  const dayMap: Record<number, string[]> = {
    0: ["sunday", "every day"],
    1: ["monday", "monday - friday", "every day"],
    2: ["tuesday", "monday - friday", "every day"],
    3: ["wednesday", "monday - friday", "every day"],
    4: ["thursday", "monday - friday", "every day"],
    5: ["friday", "monday - friday", "every day"],
    6: ["saturday", "every day"],
  };

  const parseTime = (t: string): number => {
    const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!m) return -1;
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const ampm = m[3].toUpperCase();
    if (ampm === "PM" && h !== 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return h * 60 + min;
  };

  for (const show of ALL_SHOWS) {
    if (!show.isActive || !show.timeSlot || !show.days) continue;
    if (show.timeSlot === "Hourly" || show.timeSlot === "On Demand" || show.timeSlot === "24/7") continue;
    if (show.name === "General Programming" || show.name === "Overnights") continue;

    const dayLower = show.days.toLowerCase();
    const validDays = dayMap[currentDay] || [];
    if (!validDays.some((d) => dayLower.includes(d))) continue;

    const parts = show.timeSlot.split(" - ");
    if (parts.length !== 2) continue;
    const start = parseTime(parts[0]);
    let end = parseTime(parts[1]);

    if (parts[1].trim().toLowerCase() === "midnight") {
      if (currentMinutes >= start) return show;
      continue;
    }
    if (parts[0].trim().toLowerCase() === "midnight") {
      if (currentMinutes < end) return show;
      continue;
    }
    if (start < 0 || end < 0) continue;

    if (end <= start) {
      if (currentMinutes >= start || currentMinutes < end) return show;
    } else {
      if (currentMinutes >= start && currentMinutes < end) return show;
    }
  }
  return null;
}

// ── Intent matching ─────────────────────────────────────────────────

type Intent =
  | "now_playing"
  | "whats_on"
  | "duke_next_game"
  | "duke_last_game"
  | "duke_football"
  | "duke_roster"
  | "show_schedule"
  | "show_info"
  | "host_info"
  | "station_info"
  | "contact"
  | "streams"
  | "listen"
  | "gospel"
  | "greeting"
  | "thanks"
  | "unknown";

function detectIntent(msg: string): { intent: Intent; entity?: string } {
  const q = msg.toLowerCase().trim();

  // Greetings
  if (/^(hi|hey|hello|sup|what'?s? ?up|yo)\b/.test(q)) return { intent: "greeting" };
  if (/^(thanks|thank you|thx|ty)\b/.test(q)) return { intent: "thanks" };

  // Now playing / last song
  if (/playing|song|track|music|what.*(play|on|listen)/.test(q) && !/show|schedule|program/.test(q)) {
    return { intent: "now_playing" };
  }

  // What's on / on air
  if (/what.*(on|airing)|on air|live now|current show|who.*(on|host)/.test(q) && !/duke|game|football|basketball/.test(q)) {
    return { intent: "whats_on" };
  }

  // Duke football
  if (/duke.*(football|fb)|football.*(duke|game|schedule)/.test(q)) {
    return { intent: "duke_football" };
  }

  // Duke roster / players
  if (/duke.*(roster|player|lineup|squad)|roster|player/.test(q)) {
    return { intent: "duke_roster" };
  }

  // Duke next game
  if (/duke.*(next|upcoming|when|game|play)|next.*game|when.*(duke|game)|basketball.*game|game.*duke/.test(q)) {
    return { intent: "duke_next_game" };
  }

  // Duke last game / score
  if (/duke.*(last|score|result|won|lost|win|lose)|last.*game|score/.test(q)) {
    return { intent: "duke_last_game" };
  }

  // Gospel
  if (/gospel|church|sunday.*morning|praise|worship|caravan/.test(q)) {
    return { intent: "gospel" };
  }

  // Show info — check if a specific show is mentioned
  for (const show of ALL_SHOWS) {
    const nameWords = show.name.toLowerCase().split(/\s+/);
    const significantWords = nameWords.filter((w) => w.length > 3);
    if (significantWords.some((w) => q.includes(w)) && /show|when|time|schedule|about|info/.test(q)) {
      return { intent: "show_info", entity: show.id };
    }
  }

  // Host info — check if a host is mentioned
  for (const host of ALL_HOSTS) {
    const nameLower = host.name.toLowerCase();
    const nameParts = nameLower.split(/\s+/);
    if (nameParts.some((p) => p.length > 2 && q.includes(p))) {
      return { intent: "host_info", entity: host.id };
    }
  }

  // Show schedule (general)
  if (/schedule|lineup|program|what.*(show|air)|show.*today|today.*show/.test(q)) {
    return { intent: "show_schedule" };
  }

  // Streams / channels
  if (/stream|channel|station|soul|hot 104|vibe|mixsquad|mixxsquadd|yard|riddim/.test(q)) {
    return { intent: "streams" };
  }

  // How to listen
  if (/listen|tune in|app|how.*hear|where.*hear|frequency/.test(q)) {
    return { intent: "listen" };
  }

  // Contact
  if (/contact|email|phone|address|location|reach|call/.test(q)) {
    return { intent: "contact" };
  }

  // Station info
  if (/wccg|station|about|who are|what is|tell me about/.test(q)) {
    return { intent: "station_info" };
  }

  return { intent: "unknown" };
}

// ── Response generators ─────────────────────────────────────────────

function generateResponse(
  intent: Intent,
  entity: string | undefined,
  nowPlaying: { title: string; artist: string } | null
): string {
  switch (intent) {
    case "greeting":
      return "Hey! What can I help you with? Ask me about what's playing, show schedules, Duke games, or anything about the station!";

    case "thanks":
      return "You're welcome! Let me know if you need anything else.";

    case "now_playing": {
      if (nowPlaying?.artist && nowPlaying?.title) {
        return `Right now on WCCG 104.5 FM:\n\"${nowPlaying.title}\" by ${nowPlaying.artist}`;
      }
      if (nowPlaying?.title) {
        return `Currently playing: ${nowPlaying.title}`;
      }
      return "I'm checking what's playing right now but don't have the latest info. Tune in at wccg1045fm.com or on your radio at 104.5 FM to hear what's on!";
    }

    case "whats_on": {
      const onAir = getWhatsOnNow();
      if (onAir) {
        const hosts = ALL_HOSTS.filter((h) => h.showIds.includes(onAir.id));
        const hostNames = hosts.map((h) => h.name).join(", ");
        let response = `On air right now: ${onAir.name}`;
        if (onAir.timeSlot) response += `\nTime: ${onAir.timeSlot}`;
        if (hostNames) response += `\nHosted by: ${hostNames}`;
        if (onAir.tagline) response += `\n\"${onAir.tagline}\"`;
        return response;
      }
      return "We're currently in general programming -- playing the best hip hop and R&B. Check our shows page at /shows for the full schedule!";
    }

    case "duke_next_game": {
      const next = DUKE_BASKETBALL.nextGame;
      if (next) {
        let response = `Duke Basketball next game:\n${next.gameTitle || "Regular Season"}\nvs. ${next.opponent}\n${formatDate(next.date)} at ${next.time}\nVenue: ${next.venue}`;
        if (next.broadcast) response += `\nBroadcast: ${next.broadcast}`;
        return response;
      }
      return "No upcoming Duke basketball games scheduled right now. Check back soon!";
    }

    case "duke_last_game": {
      const last = DUKE_BASKETBALL.lastGame;
      if (last) {
        const resultText = last.result === "W" ? "WON" : "LOST";
        return `Duke's last game:\n${resultText} ${last.score.duke}-${last.score.opponent} vs. ${last.opponent}\n${formatDate(last.date)} at ${last.venue}\nTop performer: ${last.topPerformer.name} -- ${last.topPerformer.points} pts, ${last.topPerformer.rebounds} reb, ${last.topPerformer.assists} ast`;
      }
      return "I don't have the last game result available right now.";
    }

    case "duke_football": {
      const next = DUKE_FOOTBALL.nextGame;
      let response = `Duke Football -- ${DUKE_FOOTBALL.conference}\nHome: ${DUKE_FOOTBALL.venue}\nHead Coach: ${DUKE_FOOTBALL.coaches[0]?.name}`;
      if (next) {
        response += `\n\nNext game: vs. ${next.opponent}\n${formatDate(next.date)} at ${next.time}\nVenue: ${next.venue}`;
        if (next.broadcast) response += `\nBroadcast: ${next.broadcast}`;
      }
      return response;
    }

    case "duke_roster": {
      const players = DUKE_BASKETBALL.players.slice(0, 8);
      let response = "Duke Basketball Roster (key players):\n";
      response += players
        .map((p) => `#${p.number} ${p.name} -- ${p.position} (${p.year})`)
        .join("\n");
      response += `\n\nHead Coach: ${DUKE_BASKETBALL.coaches[0]?.name}`;
      return response;
    }

    case "show_info": {
      const show = ALL_SHOWS.find((s) => s.id === entity);
      if (!show) return "I couldn't find that show. Try asking about a specific show name!";
      const hosts = ALL_HOSTS.filter((h) => h.showIds.includes(show.id));
      let response = `${show.name}`;
      if (show.tagline) response += `\n\"${show.tagline}\"`;
      response += `\nAirs: ${show.days}, ${show.timeSlot}`;
      response += `\nDay Part: ${getDayPart(show)}`;
      if (hosts.length > 0) response += `\nHosts: ${hosts.map((h) => h.name).join(", ")}`;
      if (show.description) response += `\n\n${show.description}`;
      return response;
    }

    case "host_info": {
      const host = ALL_HOSTS.find((h) => h.id === entity);
      if (!host) return "I couldn't find that host. Try asking about someone specific!";
      const shows = ALL_SHOWS.filter((s) => host.showIds.includes(s.id));
      let response = `${host.name} -- ${host.role}`;
      if (shows.length > 0) response += `\nShows: ${shows.map((s) => s.name).join(", ")}`;
      if (host.bio) response += `\n\n${host.bio}`;
      if (host.socialLinks.length > 0) {
        response += `\n\nSocial: ${host.socialLinks.map((l) => `${l.platform}: ${l.label}`).join(", ")}`;
      }
      return response;
    }

    case "show_schedule": {
      const est = getEST();
      const dayOfWeek = est.getDay();
      const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dayOfWeek];

      let dayFilter: string;
      if (dayOfWeek >= 1 && dayOfWeek <= 5) dayFilter = "weekday";
      else if (dayOfWeek === 6) dayFilter = "saturday";
      else dayFilter = "sunday";

      const todaysShows = ALL_SHOWS.filter((s) => {
        if (!s.isActive) return false;
        if (s.timeSlot === "On Demand" || s.timeSlot === "Hourly" || s.timeSlot === "24/7") return false;
        if (s.name === "General Programming" || s.name === "Overnights") return false;
        const d = s.days.toLowerCase();
        if (dayFilter === "weekday") return d.includes("monday") || d.includes("monday - friday");
        if (dayFilter === "saturday") return d.includes("saturday");
        return d.includes("sunday");
      });

      let response = `Today's schedule (${dayName}):\n\n`;
      response += todaysShows
        .map((s) => `${s.timeSlot} -- ${s.name}`)
        .join("\n");
      response += `\n\nVisit /shows for the full interactive schedule!`;
      return response;
    }

    case "streams":
      return `WCCG has 6 streaming channels:\n\n1. WCCG 104.5 FM -- Hip Hop & R&B (main)\n2. Soul 104.5 -- Classic R&B & Soul\n3. Hot 104.5 -- Today's Hottest Hits\n4. The Vibe -- Chill & Smooth\n5. MixxSquadd Radio -- 24/7 DJ Mixes\n6. Yard & Riddim -- Caribbean & Dancehall\n\nListen at wccg1045fm.com or browse channels at /channels`;

    case "listen":
      return "You can listen to WCCG 104.5 FM:\n\n- FM Radio: 104.5 FM in Fayetteville, NC\n- Website: wccg1045fm.com (click Listen Live)\n- All 6 streaming channels available online 24/7\n\nJust hit the \"Listen Live\" button at the top of any page!";

    case "contact":
      return "Contact WCCG 104.5 FM:\n\nCarson Communications\n115 Gillespie Street\nFayetteville, NC 28301\nPhone: (910) 484-4932\nEmail: info@wccg1045fm.com\n\nVisit /contact for more ways to reach us!";

    case "station_info":
      return "WCCG 104.5 FM is Fayetteville's home for Hip Hop, R&B, Sports, and Podcasts. Part of Carson Communications, we serve the greater NC community with 6 streaming channels, live shows, Duke sports coverage, gospel programming, and more.\n\nBroadcasting from 115 Gillespie Street, Fayetteville, NC.";

    case "gospel": {
      const gospelShows = ALL_SHOWS.filter((s) => s.category === "gospel" && s.isActive);
      let response = "Sunday Gospel Caravan on WCCG 104.5 FM:\n\n";
      response += gospelShows
        .map((s) => `${s.timeSlot} -- ${s.name}`)
        .join("\n");
      response += "\n\nTune in every Sunday morning for inspiration and praise!";
      return response;
    }

    case "unknown":
    default:
      return "I'm not sure about that one! I can help with:\n\n- What's playing now\n- What show is on air\n- Duke game schedule & scores\n- Show times & host info\n- Station contact info\n- Streaming channels\n- Gospel programming\n\nTry asking one of those!";
  }
}

// ── Component ───────────────────────────────────────────────────────

export function StationAIChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([BOT_GREETING]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [nudgeVisible, setNudgeVisible] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: nowPlaying } = useNowPlaying(true);
  const { isPlaying } = useAudioPlayer();

  // Show welcome nudge after 3 seconds, auto-hide after 6 more
  useEffect(() => {
    if (open || nudgeDismissed) return;
    const showTimer = setTimeout(() => setNudgeVisible(true), 3000);
    const hideTimer = setTimeout(() => setNudgeVisible(false), 9000);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [open, nudgeDismissed]);

  // Dismiss nudge when chat opens
  useEffect(() => {
    if (open) {
      setNudgeVisible(false);
      setNudgeDismissed(true);
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, typing]);

  const handleSend = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const text = input.trim();
      if (!text) return;

      setMessages((prev) => [...prev, { from: "user", text }]);
      setInput("");
      setTyping(true);

      // Simulate a brief "thinking" delay
      setTimeout(() => {
        const { intent, entity } = detectIntent(text);
        const response = generateResponse(intent, entity, nowPlaying);
        setMessages((prev) => [...prev, { from: "bot", text: response }]);
        setTyping(false);
      }, 400 + Math.random() * 400);
    },
    [input, nowPlaying]
  );

  return (
    <div ref={ref} className={`fixed right-4 z-50 flex flex-col items-end gap-2 transition-all duration-300 ${isPlaying ? "bottom-[168px]" : "bottom-20"}`}>
      {open && (
        <div
          className="w-80 sm:w-96 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col"
          style={{ maxHeight: "min(520px, 75vh)" }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[#74ddc7] text-[#0a0a0f]">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0a0a0f]/10">
              <MessageCircle className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">WCCG 104.5 FM</p>
              <p className="text-[10px] opacity-70">AI Station Assistant</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="hover:bg-[#0a0a0f]/10 rounded-full p-1 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px]">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-line ${
                    msg.from === "user"
                      ? "bg-[#74ddc7] text-[#0a0a0f] rounded-br-md"
                      : "bg-foreground/[0.06] text-foreground rounded-bl-md"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="bg-foreground/[0.06] text-foreground rounded-2xl rounded-bl-md px-4 py-2.5 text-sm">
                  <span className="inline-flex gap-1">
                    <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border px-3 py-3">
            <form onSubmit={handleSend} className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about shows, songs, Duke..."
                className="flex-1 rounded-full bg-foreground/[0.04] border border-border px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-[#74ddc7]/30"
                autoFocus
              />
              <button
                type="submit"
                disabled={!input.trim() || typing}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#74ddc7] text-[#0a0a0f] hover:bg-[#74ddc7]/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                  />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating button — expands with welcome text then collapses */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 rounded-full bg-[#74ddc7] text-[#0a0a0f] shadow-lg shadow-[#74ddc7]/30 hover:bg-[#74ddc7]/80 transition-all hover:scale-105 ${
          nudgeVisible && !open
            ? "pl-5 pr-4 h-14 animate-[nudgeIn_0.5s_ease-out]"
            : "h-14 w-14 justify-center"
        }`}
        aria-label="Station AI Assistant"
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : nudgeVisible ? (
          <>
            <span className="text-sm font-semibold whitespace-nowrap">Need help?</span>
            <MessageCircle className="h-5 w-5 flex-shrink-0" />
          </>
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </button>
    </div>
  );
}
