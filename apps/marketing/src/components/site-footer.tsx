import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Wordmark } from "@/components/wordmark";
import { FOOTER_LINKS, NAV_LINKS, WAITLIST_HREF } from "@/lib/nav";
import { FLAGSHIP_URL } from "@/lib/site";

/**
 * One footer for every page (the home page shows it on phones only, under the
 * model). It carries the whole menu plus what the header does not: the
 * platform overview, the station tour, the changelog and the product sheet.
 * Every link is a 44 px tap target.
 */
export function SiteFooter({ className = "" }: { className?: string }) {
  const link =
    "inline-flex min-h-11 items-center text-dim transition hover:text-fg hover:underline underline-offset-2";
  return (
    <footer className={`border-t border-line bg-ink ${className}`}>
      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-col gap-8 md:flex-row md:justify-between">
          <div className="max-w-xs">
            <Wordmark px={2} className="text-fg" />
            <p className="mt-3 text-sm leading-relaxed text-dim">
              The operating system for modern radio. Pricing on request.
            </p>
            <Link
              href={WAITLIST_HREF}
              className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-signal-ink underline-offset-2 hover:underline"
            >
              Join the waitlist <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 text-sm sm:gap-x-16">
            <ul>
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={link}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <ul>
              {FOOTER_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={link}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <p className="mt-8 border-t border-line pt-6 text-sm text-dim">
          Running in production at{" "}
          <a
            href={FLAGSHIP_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center font-semibold text-fg underline-offset-2 hover:underline"
          >
            WCCG 104.5 FM
          </a>
        </p>
      </div>
    </footer>
  );
}
