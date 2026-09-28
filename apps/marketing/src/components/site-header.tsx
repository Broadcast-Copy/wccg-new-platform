"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Menu, User, X } from "lucide-react";
import { Wordmark } from "@/components/wordmark";
import { NAV_LINKS, WAITLIST_HREF, samePath } from "@/lib/nav";
import { LOGIN_URL, PLATFORM_URL } from "@/lib/site";
import { parseHint } from "@/lib/signed-in-hint";

/**
 * One header for every page. Each page used to hand-roll its own bar, which
 * is how they drifted apart; this is the single definition. `sticky` is off
 * for the home page, where the model fills the viewport under the bar.
 *
 * The menu is the owner's (2026-09-27): Download, Developers, Documentation,
 * Support, [Join the waitlist], then Log in - or, when the platform says this
 * browser is signed in, a profile circle that opens the platform. From 1024 px
 * every item sits in the bar; below that a Menu button opens a panel with the
 * same items (a disclosure: Escape, a link, or a tap outside closes it).
 * No Tour entry - the tour is the home page, which the wordmark links to. The
 * changelog is in the footer.
 */
export function SiteHeader({ sticky = true }: { sticky?: boolean }) {
  const pathname = usePathname() ?? "/";

  return (
    <header
      className={`${sticky ? "sticky top-0" : "relative flex-none"} z-50 border-b border-line bg-ink/90 backdrop-blur`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2 sm:px-5 lg:py-3">
        <Link
          href="/"
          className="flex min-h-11 flex-col items-start justify-center gap-1.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal-ink"
          aria-label="broadcastcopy.ai home"
        >
          {/* 2 px per pixel on phones (186 px wide), 3 px from 640 up */}
          <Wordmark px={3} className="h-3.5 w-auto text-fg sm:h-[21px]" />
          <span className="hidden text-xs text-dim sm:block">
            Automate your entire broadcast studio <b className="font-semibold text-fg">end-to-end</b>.
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-6 text-sm lg:flex">
          {NAV_LINKS.map((l) => {
            const current = samePath(pathname, l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={current ? "page" : undefined}
                className={`inline-flex min-h-11 items-center transition hover:text-fg ${
                  current ? "font-semibold text-fg" : "text-dim"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-none items-center gap-2 sm:gap-3">
          <Link
            href={WAITLIST_HREF}
            className="hidden min-h-11 items-center rounded-lg bg-signal px-4 text-sm font-semibold text-fg transition hover:bg-signal-soft sm:inline-flex"
          >
            Join the waitlist
          </Link>
          <div className="hidden lg:block">
            <AccountLink />
          </div>
          <MobileMenu pathname={pathname} />
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  Log in / profile circle                                             */
/* ------------------------------------------------------------------ */

function subscribeHint(onChange: () => void) {
  // the platform may sign in or out in another tab: re-read on return
  window.addEventListener("focus", onChange);
  window.addEventListener("pageshow", onChange);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    window.removeEventListener("focus", onChange);
    window.removeEventListener("pageshow", onChange);
    document.removeEventListener("visibilitychange", onChange);
  };
}
const readHint = () => parseHint(document.cookie);
// the static HTML always says "Log in"; the browser swaps in the circle
const readHintOnServer = () => null;

function AccountLink({ inMenu = false }: { inMenu?: boolean }) {
  const hint = useSyncExternalStore(subscribeHint, readHint, readHintOnServer);

  if (hint === null) {
    return (
      <a
        href={LOGIN_URL}
        className={
          inMenu
            ? "flex min-h-12 items-center justify-center rounded-lg border border-line bg-elevated px-4 text-base font-semibold transition hover:border-dim/40"
            : "inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-fg transition hover:bg-surface"
        }
      >
        Log in
      </a>
    );
  }

  const circle = (
    <span
      className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-fg/15 bg-fg text-xs font-bold tracking-wide text-ink"
      aria-hidden
    >
      {hint ? hint : <User className="h-4 w-4" />}
    </span>
  );

  return inMenu ? (
    <a
      href={`${PLATFORM_URL}/`}
      className="flex min-h-12 items-center gap-3 rounded-lg border border-line bg-elevated px-4 text-base font-semibold transition hover:border-dim/40"
    >
      {circle}
      Your account
      <span className="ml-auto text-sm font-normal text-dim">platform</span>
    </a>
  ) : (
    <a
      href={`${PLATFORM_URL}/`}
      title="Signed in - open the platform"
      aria-label="Your account: open the Broadcast Copy platform"
      className="flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-surface focus-visible:outline-2 focus-visible:outline-signal-ink"
    >
      {circle}
    </a>
  );
}

/* ------------------------------------------------------------------ */
/*  The phone / tablet menu                                             */
/* ------------------------------------------------------------------ */

function MobileMenu({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  // Escape closes and hands focus back to the button; widening to the full
  // bar (1024 px) closes it too, since the button disappears there.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const wide = window.matchMedia("(min-width: 1024px)");
    const onWide = () => {
      if (wide.matches) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    return () => {
      document.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div
      ref={wrapRef}
      className="lg:hidden"
      onBlur={(e) => {
        // tabbing out of the button + panel closes the menu
        const next = e.relatedTarget as Node | null;
        if (open && next && !wrapRef.current?.contains(next)) close();
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-elevated text-fg transition hover:border-dim/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-ink"
      >
        {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        <span className="sr-only">{open ? "Close menu" : "Menu"}</span>
      </button>

      {/* a tap anywhere outside closes it - including on the 3D model's frame,
          which would otherwise swallow the tap. Portalled: the header's
          backdrop blur would trap a fixed element inside the bar. */}
      {open ? <Backdrop onClose={close} /> : null}

      <div
        id={panelId}
        hidden={!open}
        className="absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-line bg-ink shadow-lg"
      >
        <nav aria-label="Main" className="mx-auto max-w-6xl px-4 pt-2 pb-5 sm:px-5">
          <ul className="divide-y divide-line">
            {NAV_LINKS.map((l) => {
              const current = samePath(pathname, l.href);
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={close}
                    aria-current={current ? "page" : undefined}
                    className={`flex min-h-12 items-center text-base transition hover:text-fg ${
                      current ? "font-semibold text-fg" : "text-dim"
                    }`}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link
              href={WAITLIST_HREF}
              onClick={close}
              className="flex min-h-12 items-center justify-center rounded-lg bg-signal px-4 text-base font-semibold text-fg transition hover:bg-signal-soft"
            >
              Join the waitlist
            </Link>
            <AccountLink inMenu />
          </div>
        </nav>
      </div>
    </div>
  );
}

function Backdrop({ onClose }: { onClose: () => void }) {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-40 bg-fg/20 lg:hidden" onClick={onClose} aria-hidden />,
    document.body,
  );
}
