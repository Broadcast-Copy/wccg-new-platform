import type { Metadata } from "next";
import { GuidePage, Note, Section, Steps, Terms, Ui } from "@/components/guide";
import { SITE_URL } from "@/lib/site";

const slug = "build-and-publish-a-days-log";
const title = "Build and publish a day's log — Broadcast Copy";
const description =
  "How Broadcast Copy builds tomorrow's log from your clocks every evening, what its validation gate checks, and what happens when a check fails.";

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
      lede="Tomorrow's log is built every evening and published only if it passes the validation gate. Most days nobody has to touch it. This guide is for the days you want to look, or step in."
    >
      <Section title="What happens every evening">
        <p>
          On a schedule your station sets, the suite generates tomorrow&rsquo;s log from your
          program clocks and music rules — category picks, rotation and separation, dayparts,
          rotating pools, imaging, and hard and soft time targets — and merges in the booked
          spots from that day&rsquo;s traffic file.
        </p>
        <p>
          It then runs the validation gate over the finished day and publishes it only if
          nothing fails. A day that already exists is never regenerated, so hand edits
          survive. If tomorrow is still not ready by a later alarm time, the Broadcast Copy
          Manager says so on its status line for tomorrow&rsquo;s log.
        </p>
      </Section>

      <Section title="Check it, or run it yourself">
        <Steps
          items={[
            <>
              In the Production app, open <Ui>Schedule › Tomorrow&rsquo;s log</Ui>. Three cards
              show whether the day is generated, validated and published, with the evening
              schedule and the last run beneath them.
            </>,
            <>
              Press <Ui>Validate now</Ui> to run the gate at any time. It only reads; it changes
              nothing.
            </>,
            <>
              To build the day now rather than wait for the evening, press{" "}
              <Ui>Generate tomorrow now</Ui>. The first press shows the plan — generate, or keep
              the existing day exactly as it stands. Nothing happens until you press again to
              confirm. The run generates, validates, and publishes only if the day passes.
            </>,
            <>
              Read the findings hour by hour: failures first, then warnings. Anything you want
              to change, change in the log editor — see{" "}
              <a
                className="font-semibold text-signal-ink underline-offset-2 hover:underline"
                href="/documentation/editing-and-validating-a-log/"
              >
                Editing and validating a log
              </a>
              .
            </>,
          ]}
        />
      </Section>

      <Section title="What the gate checks">
        <p>
          The gate replays each hour the way the player will actually time it, rather than
          adding up lengths. Every check runs on every generated day.
        </p>
        <Terms
          items={[
            ["Structure", "The file is a complete generated day for that date, with every row whole."],
            [
              "Hours",
              "Every hour is there. No hour loses a booked spot or its legal ID, the ID airs near the top of the hour, and no hour runs out of audio early.",
            ],
            [
              "Hard times",
              "Every fixed-time item has playable audio, is marked so the player honours it, and lands close to its mark.",
            ],
            [
              "Restrictions",
              "Nothing the system picked breaks a kill date, start date, hour embargo or activation window. An expired spot that traffic booked is a warning by default; your station can make it a failure.",
            ],
            [
              "Silence",
              "Any position that plays nothing has to carry a stated reason — an unsold avail, a missing file.",
            ],
            [
              "Traffic",
              "The traffic file is re-read, and every booked spot must sit at its booked hour, break and position, or be flagged as missing audio or overflow. A traffic file that changed after the day was built fails.",
            ],
            [
              "Network timing",
              "For stations carrying network programming: joins land close to the network's start, and local breaks fit the network's measured rejoin window.",
            ],
          ]}
        />
      </Section>

      <Section title="When a check fails">
        <p>
          A failure stops the publish. A warning is published and listed. The run is recorded
          with the checks that failed and the findings for each hour, so the fix starts from
          the hour and the row that caused it — usually a trim in the log editor, or a
          correction in traffic — followed by <Ui>Validate now</Ui>.
        </p>
        <p>
          A day that was published and later stops passing — because its traffic file changed,
          for example — is marked failed again rather than left looking healthy.
        </p>
      </Section>

      <Section title="Every publish is a revision">
        <p>
          Each publish is a numbered revision that is never changed afterwards and carries a
          checksum, so there is never any doubt about which version of a day was published or
          whether it was altered since.
        </p>
        <Note title="Future days only">
          The build and the publish work on days after today. Today&rsquo;s log and past days
          are history: the editor opens them read-only.
        </Note>
        <Note title="Coming">
          A guided <b>Build a Day&rsquo;s Log</b> flow that walks these steps in order — pick
          the day, bring traffic in, generate, validate, edit, publish — is being built into
          the Production app.
        </Note>
      </Section>
    </GuidePage>
  );
}
