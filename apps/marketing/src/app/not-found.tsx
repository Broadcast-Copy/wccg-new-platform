import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageShell } from "@/components/page-shell";

/** The export writes this as 404.html, which .htaccess serves for any miss. */
export default function NotFound() {
  const links = [
    { href: "/", label: "The station tour" },
    { href: "/platform/", label: "The platform" },
    { href: "/documentation/", label: "Documentation" },
    { href: "/support/", label: "Support" },
  ];
  return (
    <PageShell
      eyebrow="404"
      title="That page is not here."
      lede="It may have moved, or the link may be mistyped. The step-by-step guides now live behind sign-in, in the customer documentation."
    >
      <ul className="grid gap-3 sm:grid-cols-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="flex min-h-14 items-center justify-between gap-4 rounded-xl border border-line bg-elevated px-5 font-semibold transition hover:border-signal/50"
            >
              {l.label}
              <ArrowRight className="h-4 w-4 flex-none text-signal-ink" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
