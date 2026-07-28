import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

/**
 * One header for every page. Each page used to hand-roll its own bar, which
 * is how they drifted apart; this is the single definition. `sticky` is off
 * for the home page, where the model fills the viewport under a fixed bar.
 */
const LINKS = [
  { href: "/", label: "Tour" },
  { href: "/platform", label: "Platform" },
  { href: "/platform#pricing", label: "Pricing" },
  { href: "/changelog", label: "Changelog" },
];

export function SiteHeader({ sticky = true }: { sticky?: boolean }) {
  return (
    <header
      className={`${sticky ? "sticky top-0" : "flex-none"} z-50 border-b border-line bg-ink/85 backdrop-blur`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-5 px-5 py-3.5">
        <Link href="/" className="flex items-center" aria-label="broadcastcopy.ai">
          <Wordmark px={3} className="text-fg" />
        </Link>

        <div className="hidden items-center gap-7 text-sm text-dim md:flex">
          {LINKS.map((l) => (
            <Link key={l.label} className="transition hover:text-fg" href={l.href}>
              {l.label}
            </Link>
          ))}
        </div>

        <Link
          href="/platform#early-access"
          className="rounded-lg bg-signal px-4 py-2 text-sm font-semibold text-white transition hover:bg-signal-soft"
        >
          Get early access
        </Link>
      </nav>
    </header>
  );
}
