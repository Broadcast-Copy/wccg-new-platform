import type { Metadata } from "next";
import { GuidePage, Note, Section, Steps, Terms, Ui } from "@/components/guide";
import { SITE_URL } from "@/lib/site";

const slug = "editing-and-validating-a-log";
const title = "Editing and validating a log (PD) — Broadcast Copy";
const description =
  "The Broadcast Copy log editor for program directors: what you can change, what it refuses, how every saved edit is re-validated, and the signed-in change record.";

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
      lede="The log editor in the Production app is where a program director changes a day before it airs — and every saved change is judged by the same gate as the evening build."
    >
      <Section title="Open a day">
        <Steps
          items={[
            <>
              In the Production app, open <Ui>Production › Log Editor</Ui> and pick a day.
            </>,
            <>
              Tomorrow onward is editable. Today and past days open read-only — they are
              history, not drafts.
            </>,
            <>
              The day is shown hour by hour with a state on every row, and rows with a
              scheduling problem are marked where you can see them.
            </>,
          ]}
        />
      </Section>

      <Section title="What you can change">
        <ul className="list-disc space-y-2 pl-5 marker:text-signal-ink">
          <li>Insert from a library search or by drag-and-drop.</li>
          <li>Move, delete, cut, copy and paste — across hours and across days.</li>
          <li>Replace a row, choosing from ranked suggestions.</li>
          <li>
            Insert commands, network rows, a rotating-pool item, or a voice-track slot to fill
            later.
          </li>
          <li>Copy an hour, or reshuffle an hour&rsquo;s music with a preview first.</li>
          <li>Set or clear a hard time or a time marker.</li>
          <li>Undo and redo whole edits.</li>
          <li>
            Import traffic with a dry run — see{" "}
            <a
              className="font-semibold text-signal-ink underline-offset-2 hover:underline"
              href="/documentation/inserting-traffic/"
            >
              Inserting traffic
            </a>
            .
          </li>
        </ul>
        <p>
          While you work you can audition a row or a segue on a monitor output, look up a
          cart&rsquo;s on-air history and category usage, and print the day or export it to
          CSV.
        </p>
      </Section>

      <Section title="What it refuses">
        <Terms
          items={[
            ["Renumbering", "Rows are never renumbered. An edit anchors to the row itself, not its position."],
            [
              "Locked rows",
              "Played, voice-tracked, hard-timed and stop-set rows cannot be removed or moved.",
            ],
            ["Network commands", "Changing one asks you a second time."],
            [
              "Commercials",
              "Removing a commercial needs a revenue confirmation that names its traffic booking and the make-good it will need.",
            ],
            [
              "Two editors",
              "Version checks stop two people from overwriting each other's work on the same day.",
            ],
          ]}
        />
      </Section>

      <Section title="How validation works">
        <p>
          There is no separate &ldquo;validate before save&rdquo; step to forget. Shortly after
          each saved edit, the day is re-validated by the same gate the evening build uses —
          hours, hard times, restrictions, silence, traffic and network timing. It is
          re-published only if it still passes; if it does not, you are told which check
          failed and where.
        </p>
        <p>
          A PD trimming an over-full hour is exactly what the hours check then judges, so the
          report always describes the day as edited, not as it was built.
        </p>
      </Section>

      <Section title="Profiles and the change record">
        <p>
          Log editing can require a signed-in profile. The program director, music director,
          engineering and the station admin may edit logs; jock, operator and viewer profiles
          may not.
        </p>
        <p>
          Every change is written to an append-only record — who, when, the row before and
          after, the machine it came from, and a reason the editor types — that cannot be
          edited or deleted. A periodic check rebuilds today and tomorrow from that record and
          flags any difference it cannot explain. It reports; it never changes the log.
        </p>
        <Note title="Built in, switched on by you">
          Profiles and the change record ship with the suite and stay out of the way until your
          station creates its first profile. From then on, every log edit needs a signed-in
          profile, and a profile signs out when it sits idle.
        </Note>
      </Section>
    </GuidePage>
  );
}
