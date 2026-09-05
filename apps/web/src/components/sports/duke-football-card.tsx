"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DUKE_FOOTBALL } from "@/data/sports";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { DEFAULT_STATION } from "@/lib/stations";
import { setDukeGameLive } from "@/lib/multipliers";
import type {
  DukeFootballGameState,
  FootballGame,
  FootballLive,
  PlayerGroup,
  TeamTelemetry,
} from "@/hooks/use-duke-football-game";

const DUKE_LOGO = DUKE_FOOTBALL.logoUrl;
const DUKE_BLUE = "#003087";

/* ── helpers ────────────────────────────────────────────────────────── */

function splitCountdown(diffMs: number) {
  const total = Math.max(0, Math.floor(diffMs / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}
const pad = (n: number) => n.toString().padStart(2, "0");

function kickoffLabel(iso: string) {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  });
  const time =
    d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "America/New_York",
    }) + " ET";
  return { day, time };
}

function periodLabel(live: FootballLive) {
  if (live.state === "post") return "FINAL";
  if (live.state === "pre") return "PREGAME";
  if (live.isDelayed) return "DELAYED";
  if (live.statusName === "STATUS_HALFTIME") return "HALFTIME";
  if (live.statusName === "STATUS_END_PERIOD" && live.period) return `END Q${live.period}`;
  if (!live.period) return "KICKOFF";
  if (live.displayPeriod) {
    // "3rd" → "3rd QTR", "OT" stays
    return /^\d/.test(live.displayPeriod) ? `${live.displayPeriod} QTR` : live.displayPeriod;
  }
  return live.period > 4 ? `OT${live.period - 4 > 1 ? live.period - 4 : ""}` : `Q${live.period || 1}`;
}

/* ── shared bits ────────────────────────────────────────────────────── */

function ListenLiveButton({ compact = false }: { compact?: boolean }) {
  const { play, isPlaying, currentStream, pause } = useAudioPlayer();
  const onAir = isPlaying && currentStream === DEFAULT_STATION.streamUrl;
  return (
    <button
      type="button"
      onClick={() =>
        onAir
          ? pause()
          : play(DEFAULT_STATION.streamUrl, {
              streamName: DEFAULT_STATION.name,
              title: "Duke Football on WCCG 104.5 FM",
              artist: "Live Game Broadcast",
              albumArt: DUKE_LOGO,
            })
      }
      className={`inline-flex items-center gap-2 rounded-full font-bold uppercase tracking-wide text-white transition-transform hover:scale-[1.03] active:scale-[0.98] ${
        compact ? "px-3 py-1.5 text-[11px]" : "px-5 py-2.5 text-xs sm:text-sm"
      }`}
      style={{ background: onAir ? "#c4360f" : "#ff4a1c" }}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
      </span>
      {onAir ? "On Air · Pause" : "Listen Live · 104.5 FM"}
    </button>
  );
}

function TeamBadge({
  logo,
  name,
  abbr,
  side,
  size = "lg",
}: {
  logo: string | null;
  name: string;
  abbr: string;
  side: "left" | "right";
  size?: "lg" | "sm";
}) {
  const img = size === "lg" ? "h-14 w-14 sm:h-16 sm:w-16" : "h-9 w-9";
  return (
    <div className={`flex items-center gap-3 ${side === "right" ? "flex-row-reverse text-right" : ""}`}>
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt={name} className={`${img} object-contain drop-shadow-md`} />
      ) : (
        <div className={`${img} rounded-full bg-white/10`} />
      )}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">{abbr}</p>
        <p className="text-sm font-extrabold leading-tight text-white sm:text-base">{name}</p>
      </div>
    </div>
  );
}

/* ── PRE-GAME FACE: countdown ───────────────────────────────────────── */

function CountdownFace({
  game,
  record,
  now,
}: {
  game: FootballGame;
  record: string | null;
  now: number;
}) {
  const kickoff = new Date(game.date).getTime();
  const c = splitCountdown(kickoff - now);
  const { day, time } = kickoffLabel(game.date);
  const withinHour = kickoff - now < 60 * 60_000;

  const cells: Array<[string, number]> = [
    ["Days", c.days],
    ["Hours", c.hours],
    ["Min", c.minutes],
    ["Sec", c.seconds],
  ];

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-[#003087]/60 p-5 sm:p-7"
      style={{ background: `linear-gradient(120deg, ${DUKE_BLUE} 0%, #001a4d 55%, #0a0a0f 100%)` }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, transparent 0 58px, rgba(255,255,255,.9) 58px 60px)",
        }}
      />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-white">
              Duke Football
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-white/60">
              {withinHour ? "Kickoff is almost here" : "Countdown to kickoff"}
            </span>
          </div>
          {record && (
            <span className="text-[11px] font-bold uppercase tracking-widest text-white/60">
              Duke {record}
            </span>
          )}
        </div>

        <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
          <TeamBadge logo={DUKE_LOGO} name="Duke Blue Devils" abbr="DUKE" side="left" />
          <div className="text-center">
            <p className="text-2xl font-black text-white/40 sm:text-3xl">{game.isHome ? "VS" : "@"}</p>
          </div>
          <TeamBadge
            logo={game.opponentLogo}
            name={game.opponent}
            abbr={game.opponentAbbr}
            side="right"
          />
        </div>

        <div className="mt-6 grid grid-cols-4 gap-2 sm:gap-3">
          {cells.map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-white/10 bg-black/30 px-2 py-3 text-center backdrop-blur-sm"
            >
              <p className="font-mono text-3xl font-black tabular-nums leading-none text-white sm:text-5xl">
                {pad(value)}
              </p>
              <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-white/50">
                {label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-white/70 sm:text-sm">
            <p className="font-bold text-white">
              {day} · {time}
            </p>
            <p className="mt-0.5">
              {game.venue}
              {game.broadcast ? ` · TV: ${game.broadcast}` : ""} · Radio: WCCG 104.5 FM
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/sports/duke-football"
              className="rounded-full border border-white/20 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-white/80 hover:bg-white/10"
            >
              Team page
            </Link>
            <ListenLiveButton />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── LIVE FACE: scoreboard + telemetry ──────────────────────────────── */

function Linescores({ game, live }: { game: FootballGame; live: FootballLive }) {
  const n = Math.max(4, live.dukeLinescores.length, live.opponentLinescores.length);
  const cols = Array.from({ length: n }, (_, i) => (i < 4 ? `Q${i + 1}` : `OT${i - 3 > 1 ? i - 3 : ""}`));
  const row = (abbr: string, scores: string[], total: number) => (
    <tr>
      <td className="py-1 pr-3 text-left font-bold text-white/80">{abbr}</td>
      {cols.map((_, i) => (
        <td key={i} className="px-2 py-1 text-center font-mono tabular-nums text-white/70">
          {scores[i] ?? "–"}
        </td>
      ))}
      <td className="pl-3 text-right font-mono text-base font-black tabular-nums text-white">{total}</td>
    </tr>
  );
  return (
    <table className="text-xs">
      <thead>
        <tr className="text-[10px] uppercase tracking-widest text-white/40">
          <th />
          {cols.map((c) => (
            <th key={c} className="px-2 font-semibold">
              {c}
            </th>
          ))}
          <th className="pl-3 text-right font-semibold">T</th>
        </tr>
      </thead>
      <tbody>
        {row("DUKE", live.dukeLinescores, live.dukeScore)}
        {row(game.opponentAbbr, live.opponentLinescores, live.opponentScore)}
      </tbody>
    </table>
  );
}

function StatBar({
  label,
  duke,
  opp,
  dukeText,
  oppText,
}: {
  label: string;
  duke: number;
  opp: number;
  dukeText?: string;
  oppText?: string;
}) {
  const total = duke + opp || 1;
  const dukePct = Math.round((duke / total) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] font-bold tabular-nums">
        <span className="text-white">{dukeText ?? duke}</span>
        <span className="text-[10px] uppercase tracking-widest text-white/50">{label}</span>
        <span className="text-white/80">{oppText ?? opp}</span>
      </div>
      <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full bg-[#4f8cff] transition-[width] duration-700" style={{ width: `${dukePct}%` }} />
        <div className="h-full flex-1 bg-white/35" />
      </div>
    </div>
  );
}

function TeamTelemetryPanel({
  game,
  duke,
  opp,
}: {
  game: FootballGame;
  duke: TeamTelemetry;
  opp: TeamTelemetry;
}) {
  const topSec = (s: string) => {
    const [m, sec] = s.split(":").map(Number);
    return (m || 0) * 60 + (sec || 0);
  };
  const thirdPct = (s: string) => {
    const [made, att] = s.split("-").map(Number);
    return att ? made / att : 0;
  };
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-4">
      <div className="mb-3 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-[0.2em]">
        <span className="text-[#8fb4ff]">Duke</span>
        <span className="text-white/50">Team telemetry</span>
        <span className="text-white/70">{game.opponentAbbr}</span>
      </div>
      <div className="space-y-3">
        <StatBar label="Total yards" duke={duke.totalYards} opp={opp.totalYards} />
        <StatBar label="Passing" duke={duke.passingYards} opp={opp.passingYards} />
        <StatBar label="Rushing" duke={duke.rushingYards} opp={opp.rushingYards} />
        <StatBar label="First downs" duke={duke.firstDowns} opp={opp.firstDowns} />
        <StatBar
          label="3rd down"
          duke={thirdPct(duke.thirdDown)}
          opp={thirdPct(opp.thirdDown)}
          dukeText={duke.thirdDown}
          oppText={opp.thirdDown}
        />
        <StatBar
          label="Possession"
          duke={topSec(duke.possessionTime)}
          opp={topSec(opp.possessionTime)}
          dukeText={duke.possessionTime}
          oppText={opp.possessionTime}
        />
        <StatBar label="Turnovers" duke={duke.turnovers} opp={opp.turnovers} />
        <StatBar
          label="Penalties"
          duke={Number(duke.penalties.split("-")[1] || 0)}
          opp={Number(opp.penalties.split("-")[1] || 0)}
          dukeText={duke.penalties}
          oppText={opp.penalties}
        />
      </div>
    </div>
  );
}

function PlayerTelemetryPanel({ groups }: { groups: PlayerGroup[] }) {
  const [active, setActive] = useState<string>(groups[0]?.key ?? "");
  const group = groups.find((g) => g.key === active) ?? groups[0];
  if (!group) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/50">
          Duke player telemetry
        </span>
        <div className="flex gap-1 overflow-x-auto">
          {groups.map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => setActive(g.key)}
              className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                g.key === group.key ? "bg-white text-[#003087]" : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              {g.title}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[10px] uppercase tracking-widest text-white/40">
              <th className="pb-2 text-left font-semibold">Player</th>
              {group.labels.map((l) => (
                <th key={l} className="pb-2 pl-3 text-right font-semibold">
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {group.players.slice(0, 6).map((p) => (
              <tr key={p.id} className="border-t border-white/5">
                <td className="py-1.5 pr-2">
                  <div className="flex items-center gap-2">
                    {p.headshot ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.headshot}
                        alt=""
                        className="h-7 w-7 rounded-full bg-white/10 object-cover object-top"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.visibility = "hidden";
                        }}
                      />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-white/10" />
                    )}
                    <span className="font-semibold text-white">
                      {p.shortName || p.name}
                      {p.jersey && <span className="ml-1 text-white/40">#{p.jersey}</span>}
                    </span>
                  </div>
                </td>
                {p.stats.map((s, i) => (
                  <td key={i} className="pl-3 text-right font-mono tabular-nums text-white/85">
                    {s}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScoringPlays({ plays, game }: { plays: FootballLive["scoringPlays"]; game: FootballGame }) {
  if (plays.length === 0) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-4">
      <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/50">
        Scoring plays
      </p>
      <ul className="space-y-1.5">
        {plays.slice(0, 6).map((p) => (
          <li key={p.id} className="flex items-start gap-2 text-xs">
            <span
              className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-black ${
                p.team === "duke" ? "bg-[#4f8cff]/30 text-[#bcd3ff]" : "bg-white/15 text-white/80"
              }`}
            >
              {p.type}
            </span>
            <span className="text-white/85">
              <span className="font-bold text-white">
                {p.team === "duke" ? "DUKE" : game.opponentAbbr}
              </span>{" "}
              {p.text}
              <span className="ml-1 text-white/40">
                · Q{p.period} {p.clock} · {p.dukeScore}-{p.opponentScore}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function UpdatedAgo({ fetchedAt, now }: { fetchedAt: number; now: number }) {
  const secs = Math.max(0, Math.round((now - fetchedAt) / 1000));
  return (
    <span className="font-mono text-[10px] tabular-nums text-white/45">
      {secs < 2 ? "updated just now" : `updated ${secs}s ago`}
    </span>
  );
}

function LiveFace({ game, live, now }: { game: FootballGame; live: FootballLive | null; now: number }) {
  const isFinal = live?.state === "post";
  const dukeHasBall = live?.possession === "duke";
  const oppHasBall = live?.possession === "opponent";
  const winPct = live?.dukeWinProbability;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#003087]/60">
      {/* Scoreboard */}
      <div
        className="relative p-4 sm:p-5"
        style={{ background: `linear-gradient(90deg, ${DUKE_BLUE} 0%, #001a4d 50%, ${DUKE_BLUE} 100%)` }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {!isFinal && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                Live
              </span>
            )}
            <span className="text-[11px] font-bold uppercase tracking-widest text-white/70">
              Duke Football {isFinal ? "· Final" : "· Game day"}
            </span>
            {live && <UpdatedAgo fetchedAt={live.fetchedAt} now={now} />}
          </div>
          <ListenLiveButton compact />
        </div>

        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={DUKE_LOGO} alt="Duke" className="h-12 w-12 object-contain sm:h-16 sm:w-16" />
            <div>
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
                DUKE {dukeHasBall && <span title="Possession">🏈</span>}
              </p>
              <p className="font-mono text-4xl font-black tabular-nums leading-none text-white sm:text-6xl">
                {live?.dukeScore ?? 0}
              </p>
            </div>
          </div>

          <div className="text-center">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-white/60">
              {live ? periodLabel(live) : "Kickoff"}
            </p>
            <p className="mt-1 font-mono text-2xl font-black tabular-nums text-white sm:text-3xl">
              {live?.state === "in" && live.period > 0 && !live.isDelayed ? live.clock || "" : isFinal ? "" : "—"}
            </p>
            {live?.downDistance && (
              <p className="mt-1 rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-bold text-white/80">
                {live.downDistance}
              </p>
            )}
          </div>

          <div className="flex flex-row-reverse items-center gap-3 text-right">
            {game.opponentLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={game.opponentLogo} alt={game.opponent} className="h-12 w-12 object-contain sm:h-16 sm:w-16" />
            ) : (
              <div className="h-12 w-12 rounded-full bg-white/10 sm:h-16 sm:w-16" />
            )}
            <div>
              <p className="flex items-center justify-end gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
                {oppHasBall && <span title="Possession">🏈</span>} {game.opponentAbbr}
              </p>
              <p className="font-mono text-4xl font-black tabular-nums leading-none text-white sm:text-6xl">
                {live?.opponentScore ?? 0}
              </p>
            </div>
          </div>
        </div>

        {/* Last play strip */}
        <div className="mt-4 rounded-lg bg-black/30 px-3 py-2 text-xs text-white/85">
          {live?.lastPlay ? (
            <>
              <span className="mr-2 rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                {isFinal ? "Last play" : "On the field"}
              </span>
              {live.lastPlay}
              {live.driveSummary && (
                <span className="ml-2 text-white/45">
                  · {live.driveTeam === "duke" ? "Duke" : game.opponentAbbr} drive: {live.driveSummary}
                </span>
              )}
            </>
          ) : (
            <span className="text-white/60">
              {!live
                ? "Connecting to the live feed…"
                : live.isDelayed
                  ? `Kickoff is delayed at ${game.venue.split(",")[0]} — stay with WCCG 104.5 FM for updates.`
                  : live.detail || "Waiting for the first snap…"}
            </span>
          )}
        </div>

        {typeof winPct === "number" && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-white/50">
              <span>Duke win probability</span>
              <span className="font-mono text-white">{Math.round(winPct * 100)}%</span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-[#4f8cff] transition-[width] duration-700"
                style={{ width: `${Math.round(winPct * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Telemetry body */}
      <div className="space-y-3 bg-[#0a0a0f] p-3 sm:p-4">
        {live && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/25 px-4 py-3">
            <Linescores game={game} live={live} />
            <div className="text-right text-[11px] text-white/60">
              <p className="font-bold text-white/80">{game.venue}</p>
              <p>
                {game.broadcast ? `TV: ${game.broadcast} · ` : ""}Radio: WCCG 104.5 FM
              </p>
              <Link href="/sports/duke-football" className="mt-1 inline-block underline-offset-2 hover:underline">
                Full team page →
              </Link>
            </div>
          </div>
        )}

        {live?.dukeStats && live.opponentStats && (
          <div className="grid gap-3 lg:grid-cols-2">
            <TeamTelemetryPanel game={game} duke={live.dukeStats} opp={live.opponentStats} />
            {live.dukePlayers.length > 0 ? (
              <PlayerTelemetryPanel groups={live.dukePlayers} />
            ) : (
              <div className="rounded-xl border border-white/10 bg-black/25 p-4 text-xs text-white/60">
                Player stats populate after the first series.
              </div>
            )}
          </div>
        )}

        {live && <ScoringPlays plays={live.scoringPlays} game={game} />}

        {!live?.dukeStats && (
          <p className="px-1 text-center text-[11px] text-white/50">
            {live
              ? "Team and player telemetry appear once ESPN opens the box score."
              : "Pulling the live box score from ESPN…"}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── the card: flips from countdown → live at kickoff ───────────────── */

export function DukeFootballCard({ state }: { state: DukeFootballGameState }) {
  const { game, record, live, phase } = state;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Duke Game Day double points while the game is on
  const isLive = phase === "live";
  useEffect(() => {
    setDukeGameLive(isLive);
    return () => setDukeGameLive(false);
  }, [isLive]);

  const face = useMemo(() => (phase === "pre" ? "front" : "back"), [phase]);

  if (!game || phase === "none" || phase === "loading") return null;

  return (
    <section className="px-4 md:px-[50px]" aria-live="polite">
      <style>{`
        @keyframes duke-card-flip {
          0%   { transform: perspective(1400px) rotateY(-92deg); opacity: 0; }
          60%  { opacity: 1; }
          100% { transform: perspective(1400px) rotateY(0deg); opacity: 1; }
        }
        .duke-card-face { animation: duke-card-flip .75s cubic-bezier(.2,.8,.2,1) both; transform-origin: 50% 50%; backface-visibility: hidden; }
        @media (prefers-reduced-motion: reduce) { .duke-card-face { animation: none; } }
      `}</style>
      <div key={face} className="duke-card-face">
        {face === "front" ? (
          <CountdownFace game={game} record={record} now={now} />
        ) : (
          <LiveFace game={game} live={live} now={now} />
        )}
      </div>
    </section>
  );
}
