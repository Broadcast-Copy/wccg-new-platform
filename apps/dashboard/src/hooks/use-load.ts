"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type LoadResult<T> = { ok: true; value: T } | { ok: false; message: string };

export type LoadState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; value: T; refreshing: boolean };

/**
 * Run an async read and expose it as a discriminated union, with reload().
 *
 * Loading is DERIVED (the answer on hand is for an older request), so the
 * effect never sets state synchronously; state is only set when the promise
 * settles, and a superseded answer is ignored. `key` re-runs the read when a
 * caller's inputs change (a filter, a page number). While a newer request is
 * in flight, the last good value stays on screen with refreshing=true, so an
 * action followed by reload() does not blank the list.
 */
export function useLoad<T>(
  load: () => Promise<LoadResult<T>>,
  key: string = "",
): { state: LoadState<T>; reload: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [answer, setAnswer] = useState<{ tag: string; result: LoadResult<T> } | null>(null);
  const tag = `${attempt}:${key}`;

  useEffect(() => {
    let cancelled = false;
    load().then(
      (result) => {
        if (!cancelled) setAnswer({ tag, result });
      },
      (err: unknown) => {
        if (!cancelled) {
          setAnswer({
            tag,
            result: { ok: false, message: err instanceof Error ? err.message : "Request failed." },
          });
        }
      },
    );
    return () => {
      cancelled = true;
    };
    // `load` is recreated every render by callers; `tag` is what identifies a request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tag]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  // Memoised so consumers can key their own useMemo on `state`.
  const state = useMemo<LoadState<T>>(() => {
    if (answer === null) return { status: "loading" };
    if (answer.result.ok) return { status: "ready", value: answer.result.value, refreshing: answer.tag !== tag };
    if (answer.tag !== tag) return { status: "loading" };
    return { status: "error", message: answer.result.message };
  }, [answer, tag]);

  return { state, reload };
}
