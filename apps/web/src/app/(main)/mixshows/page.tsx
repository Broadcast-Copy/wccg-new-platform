import { MixshowArchive } from "@/components/mixshow-archive/mixshow-archive";

/**
 * /mixshows — the public Mixshow Archive (single static route).
 *
 * Server-component wrapper so the page can export metadata under
 * `output: "export"`; all data loading happens client-side in
 * components/mixshow-archive (browser → Supabase directly, RLS-gated).
 * DJ filtering is client-side via the ?dj=<slug> search param.
 */

export const metadata = {
  title: "Mixshow Archive | WCCG 104.5 FM",
  description:
    "Stream every published DJ mixshow from WCCG 104.5 FM — browse by week or by DJ, press play, and follow the DJs keeping the Carolinas moving.",
};

export default function MixshowsPage() {
  return <MixshowArchive />;
}
