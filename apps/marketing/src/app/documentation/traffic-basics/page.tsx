import type { Metadata } from "next";
import { GuidePage, Note, Section, Terms, Ui } from "@/components/guide";
import { SITE_URL } from "@/lib/site";

const slug = "traffic-basics";
const title = "Traffic section basics — Broadcast Copy";
const description =
  "The Broadcast Copy traffic desk: orders, copy, the as-run, make-goods, invoicing and A/R, political requests and reports — and how it runs beside your current traffic system.";

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
      lede="The traffic desk in the Production app covers a traffic department's working day — orders, copy, the as-run, make-goods, billing and reports — and runs beside your current traffic system until you trust it."
    >
      <Section title="Beside your current system first">
        <p>
          <Ui>Traffic › Build Traffic</Ui> shows a week&rsquo;s avails from your clocks — sold,
          free and over — takes orders, plans and books them with a conflict review, then
          stages the week and compares it line by line with what your existing traffic system
          produced for the same week.
        </p>
        <p>
          The one step that writes to the air log, <b className="text-fg">publish</b>, stays
          off until the two agree week after week and your station switches it on. A parity
          tracker measures your written criteria for retiring the old system, week by week, so
          that decision rests on numbers rather than a feeling.
        </p>
      </Section>

      <Section title="The desk, area by area">
        <Terms
          items={[
            [
              "Orders",
              "New orders against a rate card version; add lines; approve, send back to proposal, promote to contract, or cancel.",
            ],
            [
              "Booking rules",
              "Overselling and separation breaches are refused by default; overriding them takes a planner's extra rights. Credit and threshold warnings show as you book.",
            ],
            [
              "Copy",
              "Write copy as a draft, approve or retire it, assign it to an order with its length checked, and attach its audio.",
            ],
            ["As-run", "Import what actually aired, preview it, then apply it."],
            [
              "Make-goods",
              "See what did not air, try a slot, and propose a make-good. Proposing books nothing — a person books it.",
            ],
            [
              "Invoicing & A/R",
              "Preview an invoice (which stores nothing), draft, issue or void it; record payments and allocate them; close a month; put an account on credit hold.",
            ],
            [
              "Political",
              "Enter a political request and its outcome for the public file. The desk does not classify a request for you — a person does.",
            ],
            ["Reports", "Pick a report from the catalogue, run it for a period, and save it as CSV or text."],
          ]}
        />
      </Section>

      <Section title="Proof of play, from the aired day">
        <p>
          The as-run comes from the player&rsquo;s own record of what actually aired, not from
          the log as it was planned. From it the suite produces the daily as-run, spot
          affidavits by advertiser, music-use reports for licensing, a reconcile file for
          traffic and a missed-spot report — each with CSV and print.
        </p>
      </Section>

      <Section title="Two presses for anything that matters">
        <p>
          Staging a week, applying an as-run and proposing a make-good each take two presses:
          the first shows exactly what will change, the second does it. Each act runs as one
          transaction, so it either happens completely or not at all.
        </p>
      </Section>

      <Section title="Moving your history over">
        <p>
          Your old system&rsquo;s exports go into an inbox, where each one is dry-run before it
          loads. Customer lists load today; the other loaders follow as sample exports arrive.
        </p>
        <Note title="Still to come">
          Editing an existing order line or an order&rsquo;s header, pulling booked spots back
          off the log, credits and A/R adjustments, reopening a closed month, and billing
          plans.
        </Note>
      </Section>
    </GuidePage>
  );
}
