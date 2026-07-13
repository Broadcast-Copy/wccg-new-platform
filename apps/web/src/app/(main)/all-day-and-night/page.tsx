"use client";

import { Alfa_Slab_One, Work_Sans } from "next/font/google";
import { useEffect, useRef, useState } from "react";
import { AppImage as Image } from "@/components/ui/app-image";

const displayFont = Alfa_Slab_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--adn-font-display",
});

const bodyFont = Work_Sans({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--adn-font-body",
});

const STREAM_URL = "https://music.wccg1045fm.com:8007/stream";
const APK_URL = "/downloads/AllDayAndNight-v1.0.apk";
const LOGO_SRC = "/images/logos/yard-riddim-logo.png";

type Status = "live" | "buffering" | "error";

export default function AllDayAndNightPage() {
  const [subscribed, setSubscribed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState<Status>("live");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setSubscribed(window.localStorage.getItem("adn_subscribed") === "1");
  }, []);

  function subscribe() {
    window.localStorage.setItem("adn_subscribed", "1");
    setSubscribed(true);
  }

  function resetPaywall() {
    window.localStorage.removeItem("adn_subscribed");
    setSubscribed(false);
    audioRef.current?.pause();
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      setStatus("buffering");
      audio.play().catch(() => setStatus("error"));
    } else {
      audio.pause();
    }
  }

  return (
    <div
      className={`adn-root ${displayFont.variable} ${bodyFont.variable} -mx-4 -mt-8 sm:-mx-6 lg:-mx-8 2xl:-mx-12`}
    >
      <style>{`
        .adn-root {
          --ground: #17120B;
          --ground-raised: #1F1810;
          --gold: #E8A94A;
          --jungle: #2C8657;
          --flame: #E2472B;
          --cream: #F4E9D8;
          --dim: #A8927A;
          --dim-2: #6E5D48;
          --ink: #241A10;
          --display: var(--adn-font-display), ui-serif, Georgia, serif;
          --body: var(--adn-font-body), -apple-system, BlinkMacSystemFont, sans-serif;

          background: var(--ground);
          color: var(--cream);
          font-family: var(--body);
          background-image: radial-gradient(circle at 1.5px 1.5px, rgba(244,233,216,0.05) 1px, transparent 0);
          background-size: 22px 22px;
        }
        .adn-page {
          max-width: 640px;
          margin: 0 auto;
          padding: 56px 24px 64px;
          display: flex;
          flex-direction: column;
          gap: 56px;
        }
        .adn-masthead { text-align: center; }
        .adn-eyebrow {
          font-weight: 700;
          font-size: 12px;
          letter-spacing: 2.2px;
          text-transform: uppercase;
          color: var(--gold);
          margin: 0 0 18px;
        }
        .adn-eyebrow::before {
          content: "";
          display: inline-block;
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--flame);
          margin-right: 8px;
          vertical-align: middle;
          box-shadow: 0 0 0 3px rgba(226,71,43,0.18);
        }
        .adn-title {
          font-family: var(--display);
          font-weight: 400;
          font-size: clamp(40px, 10vw, 64px);
          line-height: 0.92;
          letter-spacing: 0.5px;
          margin: 0 0 18px;
          text-wrap: balance;
          color: var(--cream);
          text-shadow: 3px 3px 0 rgba(226,71,43,0.55);
        }
        .adn-sub {
          font-size: 16px;
          line-height: 1.55;
          color: var(--dim);
          max-width: 42ch;
          margin: 0 auto;
          text-wrap: balance;
        }
        .adn-sub b { color: var(--cream); font-weight: 600; }
        .adn-stage {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 0 8px;
        }
        .adn-rays {
          position: absolute;
          width: 640px; height: 640px;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          background: repeating-conic-gradient(from 0deg, rgba(232,169,74,0.10) 0deg 6deg, transparent 6deg 12deg);
          border-radius: 50%;
          animation: adn-spin 90s linear infinite;
          z-index: 0;
        }
        @media (prefers-reduced-motion: reduce) { .adn-rays { animation: none; } }
        @keyframes adn-spin { to { transform: translate(-50%, -50%) rotate(360deg); } }
        .adn-glow {
          position: absolute;
          width: 360px; height: 360px;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          background: radial-gradient(circle, rgba(44,134,87,0.35), transparent 70%);
          filter: blur(10px);
          z-index: 0;
        }
        .adn-caption {
          text-align: center;
          color: var(--dim-2);
          font-size: 12px;
          letter-spacing: 0.4px;
          margin-top: -32px;
        }
        .adn-phone {
          position: relative;
          z-index: 1;
          width: 300px;
          height: 630px;
          background: var(--ground-raised);
          border-radius: 38px;
          border: 8px solid #0E0A06;
          box-shadow: 0 30px 70px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(244,233,216,0.05);
          overflow: hidden;
        }
        .adn-notch {
          position: absolute;
          top: 8px; left: 50%;
          transform: translateX(-50%);
          width: 96px; height: 20px;
          background: #0E0A06;
          border-radius: 12px;
          z-index: 5;
        }
        .adn-screen {
          position: absolute; inset: 0;
          display: none;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 26px 26px;
          text-align: center;
        }
        .adn-screen.adn-active { display: flex; }
        .adn-art {
          width: 108px; height: 108px;
          border-radius: 16px;
          object-fit: cover;
          margin-bottom: 22px;
          box-shadow: 0 10px 26px rgba(0,0,0,0.5);
        }
        .adn-art-lg { width: 168px; height: 168px; margin-bottom: 20px; }
        .adn-screen h2 {
          font-family: var(--display);
          font-weight: 400;
          font-size: 19px;
          letter-spacing: 0.3px;
          margin: 0 0 10px;
          color: var(--cream);
        }
        .adn-h2-lg { font-size: 20px !important; margin-bottom: 4px !important; }
        .adn-tagline { color: var(--dim); font-size: 12px; margin: 0 0 6px; }
        .adn-body-text { color: var(--dim); font-size: 13px; line-height: 1.5; margin: 0 0 22px; }
        .adn-status {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.2px;
          color: var(--jungle);
          margin-bottom: 28px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .adn-status.adn-buffering { color: var(--gold); }
        .adn-status.adn-error { color: var(--flame); }
        .adn-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
        .adn-status.adn-buffering .adn-dot { animation: adn-pulse 1s infinite ease-in-out; }
        @keyframes adn-pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        .adn-cta {
          width: 100%;
          height: 48px;
          border: none;
          border-radius: 999px;
          background: var(--gold);
          color: var(--ink);
          font-family: var(--body);
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
        }
        .adn-cta:hover { background: #EEB863; }
        .adn-cta:active { transform: scale(0.98); }
        .adn-cta:focus-visible { outline: 2px solid var(--cream); outline-offset: 3px; }
        .adn-disclaimer { color: var(--dim-2); font-size: 10px; margin-top: 12px; line-height: 1.4; }
        .adn-play-btn {
          width: 76px; height: 76px;
          border-radius: 50%;
          background: var(--gold);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: box-shadow 0.2s ease, transform 0.1s ease;
        }
        .adn-play-btn:hover { box-shadow: 0 0 0 10px rgba(232,169,74,0.12); }
        .adn-play-btn:active { transform: scale(0.96); }
        .adn-play-btn:focus-visible { outline: 2px solid var(--cream); outline-offset: 4px; }
        .adn-play-btn svg { width: 28px; height: 28px; fill: var(--ink); }
        .adn-reset-link {
          position: absolute;
          bottom: 12px; left: 0; right: 0;
          text-align: center;
          font-size: 10px;
          color: var(--dim-2);
          cursor: pointer;
          background: none;
          border: none;
          font-family: var(--body);
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .adn-download {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 26px;
          padding: 10px 20px;
          border-radius: 999px;
          border: 1px solid rgba(244,233,216,0.25);
          color: var(--cream);
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
        }
        .adn-download:hover { border-color: var(--gold); color: var(--gold); }
        .adn-download-wrap { text-align: center; margin-top: -32px; }
        .adn-features {
          display: flex;
          flex-direction: column;
          border-top: 1px solid rgba(244,233,216,0.12);
        }
        .adn-feature {
          display: flex;
          align-items: baseline;
          gap: 16px;
          padding: 18px 0;
          border-bottom: 1px solid rgba(244,233,216,0.12);
        }
        .adn-feature .adn-mark {
          font-family: var(--display);
          font-size: 13px;
          color: var(--flame);
          flex-shrink: 0;
          width: 20px;
        }
        .adn-feature .adn-txt { display: flex; flex-direction: column; gap: 2px; }
        .adn-feature .adn-label {
          font-weight: 700;
          font-size: 13px;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          color: var(--cream);
        }
        .adn-feature .adn-desc { font-size: 13px; color: var(--dim); line-height: 1.45; }
        .adn-footer { text-align: center; font-size: 11px; color: var(--dim-2); line-height: 1.7; }
        .adn-footer .adn-station { color: var(--gold); font-weight: 600; }
      `}</style>

      <div className="adn-page">
        <div className="adn-masthead">
          <p className="adn-eyebrow">WCCG 104.5 FM · Carson Communications</p>
          <h1 className="adn-title">
            ALL DAY
            <br />
            AND NIGHT
          </h1>
          <p className="adn-sub">
            <b>Yard &amp; Riddim Radio</b> in your pocket — Caribbean &amp; reggae,
            live around the clock.
          </p>
        </div>

        <div>
          <div className="adn-stage">
            <div className="adn-rays" aria-hidden="true" />
            <div className="adn-glow" aria-hidden="true" />

            <div className="adn-phone">
              <div className="adn-notch" />

              <div className={`adn-screen ${!subscribed ? "adn-active" : ""}`}>
                <Image src={LOGO_SRC} alt="Yard & Riddim Radio" width={108} height={108} className="adn-art" />
                <h2>Unlock All Day and Night</h2>
                <p className="adn-body-text">
                  $1/month gets you unlimited streaming, including the top-of-the-hour
                  commercial breaks that keep the station on the air.
                </p>
                <button className="adn-cta" onClick={subscribe}>
                  Start listening — $1/month
                </button>
                <div className="adn-disclaimer">
                  Placeholder subscription — no payment is collected yet.
                </div>
              </div>

              <div className={`adn-screen ${subscribed ? "adn-active" : ""}`}>
                <Image
                  src={LOGO_SRC}
                  alt="Yard & Riddim Radio"
                  width={168}
                  height={168}
                  className="adn-art adn-art-lg"
                />
                <h2 className="adn-h2-lg">All Day and Night</h2>
                <p className="adn-tagline">Caribbean &amp; Reggae, live all day and night</p>
                <div className={`adn-status ${status === "buffering" ? "adn-buffering" : status === "error" ? "adn-error" : ""}`}>
                  <span className="adn-dot" />
                  <span>
                    {status === "buffering"
                      ? "CONNECTING…"
                      : status === "error"
                        ? "COULD NOT CONNECT"
                        : "LIVE"}
                  </span>
                </div>
                <button
                  className="adn-play-btn"
                  aria-label={playing ? "Pause" : "Play"}
                  onClick={togglePlay}
                >
                  {playing ? (
                    <svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  )}
                </button>
                <button className="adn-reset-link" onClick={resetPaywall}>
                  reset paywall
                </button>
              </div>
            </div>
          </div>
          <p className="adn-caption">Tap through it — same app that's on your phone.</p>

          <div className="adn-download-wrap">
            <a className="adn-download" href={APK_URL} download>
              ⬇ Download for Android (.apk)
            </a>
          </div>
        </div>

        <div className="adn-features">
          <div className="adn-feature">
            <span className="adn-mark">I.</span>
            <div className="adn-txt">
              <span className="adn-label">Live, 24/7</span>
              <span className="adn-desc">One station, always on — no schedule to check, no episodes to pick.</span>
            </div>
          </div>
          <div className="adn-feature">
            <span className="adn-mark">II.</span>
            <div className="adn-txt">
              <span className="adn-label">Keeps playing, screen off</span>
              <span className="adn-desc">Lock the phone, switch apps — the riddim doesn't stop.</span>
            </div>
          </div>
          <div className="adn-feature">
            <span className="adn-mark">III.</span>
            <div className="adn-txt">
              <span className="adn-label">Top-of-the-hour spots</span>
              <span className="adn-desc">$1/month keeps the signal running and the sponsors happy.</span>
            </div>
          </div>
        </div>

        <footer className="adn-footer">
          Built for <span className="adn-station">WCCG 104.5 FM</span> — Fayetteville, North Carolina.
          <br />
          Android app · v1.0
        </footer>
      </div>

      <audio
        ref={audioRef}
        preload="none"
        onPlaying={() => {
          setPlaying(true);
          setStatus("live");
        }}
        onWaiting={() => setStatus("buffering")}
        onPause={() => {
          setPlaying(false);
          setStatus("live");
        }}
        onError={() => setStatus("error")}
      >
        <source src={STREAM_URL} />
      </audio>
    </div>
  );
}
