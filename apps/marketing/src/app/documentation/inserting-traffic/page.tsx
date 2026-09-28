import type { Metadata } from "next";
import { GuidePage, Note, Section, Steps, Terms, Ui } from "@/components/guide";
import { SITE_URL } from "@/lib/site";

const slug = "inserting-traffic";
const title = "Inserting traffic — Broadcast Copy";
const description =
  "How booked spots reach a day's log in Broadcast Copy: read at the evening build, or imported into a day you are editing with a dry run first.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/documentation/${slug}/` },
  openGraph: { title, description, type: "article", url: `${SITE_URL}/documentation/${slug}/` },
};

export default function Page() {
  return (
    <GuidePage
      slug={slug}
      lede="Booked spots reach a day's log in one of two ways: the evening build reads that day's traffic file, or you import traffic into a day you are editing. Either way you see where every spot landed, and why any did not."
    >
      <Section title="At the evening build">
        <p>
          Traffic for a day has to be in before the evening build reads it. The build places
          each booked spot at its booked hour, break and position. Nothing is quietly dropped:
        </p>
        <Terms
          items={[
            ["Placed", "The spot sits at its booked position."],
            ["Overflow", "The spot did not fit its break. It is named as overflow, a warning you can act on."],
            ["Missing audio", "The spot is booked but its audio is not in the library. It is flagged, not skipped silently."],
            [
              "Unsold avail",
              "An avail nobody bought stays in the log as a silent row carrying its reason. It is not filled with something else.",
            ],
          ]}
        />
        <p>
          A traffic change made on the day never reaches that day&rsquo;s log. If a published
          day&rsquo;s traffic file changes afterwards, the day fails the gate&rsquo;s traffic
          check until it is dealt with — the Broadcast Copy Manager shows traffic readiness for
          tomorrow on its status lines.
        </p>
      </Section>

      <Section title="Into a day you are editing">
        <Steps
          items={[
            <>
              Open the day in the log editor (<Ui>Production › Log Editor</Ui>). Tomorrow onward is
              editable.
            </>,
            <>
              Start a traffic import. A dry run lists every booking&rsquo;s outcome — placed,
              conflict, missing audio, expired, no break, overflow — before anything changes.
            </>,
            <>
              Apply it. Apply is tied to the dry run you just read, places spots after the break
              position, and undoes as one step if you change your mind.
            </>,
            <>
              The editor re-checks the day after the change is saved, the same way it does for
              any edit. Press <Ui>Validate now</Ui> on the Tomorrow&rsquo;s log tab if you want
              the full report straight away.
            </>,
          ]}
        />
        <Note title="What an import never does">
          No break marker or avail row is ever removed by an import. Taking a commercial back
          out is a separate, deliberate edit — see the PD guide.
        </Note>
      </Section>

      <Section title="Where the traffic file comes from">
        <p>
          From your current traffic system&rsquo;s daily file — or, once your station switches
          it on, from the Broadcast Copy traffic desk, which stages a week and publishes each
          day to the log.
        </p>
        <p>
          The desk&rsquo;s publish refuses today, past days, days more than six days out, days
          that were never staged, and days whose bookings changed since staging. Before it
          writes, it backs up the file it replaces, checks the backup and records how to roll
          back.
        </p>
      </Section>
    </GuidePage>
  );
}
