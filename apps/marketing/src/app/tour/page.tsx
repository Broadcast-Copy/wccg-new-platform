import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Radio } from "lucide-react";
import { SITE_URL } from "@/lib/site";

const title = "Station tour — Broadcast Copy";
const description =
  "Walk a full-power radio station floor by floor and see exactly what Broadcast Copy runs in every room — studios, operations, front office and the field kit.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/tour` },
  openGraph: { title, description, type: "website", url: `${SITE_URL}/tour` },
};

/**
 * The model is a self-contained WebGL page under /public/dollhouse so it works
 * with `output: 'export'` and needs no Three.js dependency in this app's build.
 */
export default function TourPage() {
  return (
    <div className="flex h-screen flex-col">
      <header className="z-50 flex-none border-b border-line/70 bg-ink/80 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <Radio className="h-5 w-5 text-signal" aria-hidden />
            Broadcast&nbsp;Copy
          </Link>
          <div className="flex items-center gap-5">
            <span className="hidden text-sm text-dim sm:inline">
              Every department, one platform
            </span>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-dim transition hover:text-fg"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Home
            </Link>
          </div>
        </nav>
      </header>

      <iframe
        src="/dollhouse/"
        title="Interactive 3D model of a radio station, room by room"
        className="w-full flex-1 border-0"
      />
    </div>
  );
}
