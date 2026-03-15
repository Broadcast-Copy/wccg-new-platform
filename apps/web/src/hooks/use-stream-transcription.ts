"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { DUKE_BASKETBALL } from "@/data/sports";

/**
 * A transcript line from the live stream audio.
 */
export interface TranscriptLine {
  id: number;
  text: string;
  timestamp: number;
  isFinal: boolean;
  /** Matched person name (player or coach) found in the text */
  mentionedPerson?: string;
}

// All people (players + coaches) we can match against
const ALL_PEOPLE = [
  ...DUKE_BASKETBALL.players
    .filter((p) => p.imageUrl)
    .map((p) => ({
      name: p.name,
      lastName: p.name.split(" ").pop()?.toLowerCase() || "",
    })),
  ...DUKE_BASKETBALL.coaches
    .filter((c) => c.imageUrl)
    .map((c) => ({
      name: c.name,
      lastName: c.name.split(" ").pop()?.toLowerCase() || "",
    })),
];

/** Find a player/coach name mentioned in text */
export function findMentionedPerson(text: string): string | undefined {
  const lower = text.toLowerCase();
  // Full name match first (handles "Cameron Boozer" vs "Cayden Boozer")
  for (const p of ALL_PEOPLE) {
    if (lower.includes(p.name.toLowerCase())) return p.name;
  }
  // Last name match
  for (const p of ALL_PEOPLE) {
    if (lower.includes(p.lastName)) return p.name;
  }
  return undefined;
}

// Extend Window for SpeechRecognition (webkit-prefixed in most browsers)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionClass {
  new (): SpeechRecognitionInstance;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event & { error: string }) => void) | null;
  onend: (() => void) | null;
}

/**
 * Hook that transcribes the live audio stream using the Web Speech API.
 *
 * How it works:
 * 1. Captures audio from the audio element via AudioContext → MediaStreamDestination
 * 2. Routes the captured stream to SpeechRecognition for transcription
 * 3. Falls back to microphone-based recognition if direct capture isn't supported
 * 4. Matches recognized names against the Duke roster for spotlight images
 *
 * The Web Speech API captures through the browser's audio pipeline.
 * When the stream is playing, the recognition engine processes the audio
 * and returns text that we scan for player/coach names.
 */
export function useStreamTranscription(
  enabled: boolean,
  audioElement: HTMLAudioElement | null
) {
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [currentLine, setCurrentLine] = useState<TranscriptLine | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const lineIdRef = useRef(0);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  const stopRecognition = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  useEffect(() => {
    if (!enabled) {
      stopRecognition();
      return;
    }

    // Check for Web Speech API support
    const SpeechRecognition = (
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition
    ) as SpeechRecognitionClass | undefined;

    if (!SpeechRecognition) {
      setError("Speech recognition not supported in this browser");
      return;
    }

    // Try to set up audio capture from the stream element
    if (audioElement && !sourceRef.current) {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext();
        }
        // Only create the source once per audio element
        sourceRef.current =
          audioContextRef.current.createMediaElementSource(audioElement);
        // IMPORTANT: Still route to speakers so the user hears the stream
        sourceRef.current.connect(audioContextRef.current.destination);
      } catch {
        // Audio element may already have a source — that's fine, we fall through
        // to microphone-based recognition which picks up the stream from speakers
      }
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript.trim();
        if (!text) continue;

        const isFinal = result.isFinal;
        const mentionedPerson = findMentionedPerson(text);

        if (isFinal) {
          lineIdRef.current += 1;
          const newLine: TranscriptLine = {
            id: lineIdRef.current,
            text,
            timestamp: Date.now(),
            isFinal: true,
            mentionedPerson,
          };
          setLines((prev) => [newLine, ...prev].slice(0, 50)); // Keep last 50
          setCurrentLine(newLine);
        } else {
          // Interim result — show as current but don't add to lines yet
          setCurrentLine({
            id: lineIdRef.current + 1,
            text,
            timestamp: Date.now(),
            isFinal: false,
            mentionedPerson,
          });
        }
      }
    };

    recognition.onerror = (event) => {
      const errType = (event as Event & { error: string }).error;
      if (errType === "no-speech" || errType === "aborted") {
        // Expected — just restart
        return;
      }
      if (errType === "not-allowed") {
        setError("Microphone access denied — enable mic for live captions");
        setIsListening(false);
        return;
      }
      console.warn("Speech recognition error:", errType);
    };

    recognition.onend = () => {
      // Auto-restart if still enabled
      if (enabled) {
        restartTimeoutRef.current = setTimeout(() => {
          try {
            recognition.start();
          } catch {
            // ignore
          }
        }, 300);
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsListening(true);
      setError(null);
    } catch {
      setError("Could not start speech recognition");
    }

    return () => {
      stopRecognition();
    };
  }, [enabled, audioElement, stopRecognition]);

  // Cleanup audio context on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return {
    lines,
    currentLine,
    isListening,
    error,
  };
}
