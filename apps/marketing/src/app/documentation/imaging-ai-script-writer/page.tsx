import type { Metadata } from "next";
import { GuidePage, Note, Section, Steps, Terms, Ui } from "@/components/guide";
import { SITE_URL } from "@/lib/site";

const slug = "imaging-ai-script-writer";
const title = "Imaging with the AI script writer — Broadcast Copy";
const description =
  "Imaging categories, the holiday calendar and its order-by dates, and drafting imaging scripts with Broadcast Copy's optional AI writer — advisory drafts a person saves.";

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
      lede="Imaging is organised by type and occasion, with a holiday calendar that tells production when to order. When you need words, an optional AI writer drafts the script — and a person decides what is saved and what is sent."
    >
      <Section title="Categories">
        <p>
          Every imaging category is a <b className="text-fg">type</b> crossed with an{" "}
          <b className="text-fg">occasion</b>. Types are station ID, sweeper, promo, open,
          tease, rejoin, closing, liner and stop-set bumper. Occasions are generic, the standard
          US holidays and observances, and any events your station adds. Each category airs
          where its type already airs, and a new item takes the next free cart number in its
          category&rsquo;s range.
        </p>
      </Section>

      <Section title="The holiday calendar">
        <p>
          Occasions are dated by rule — a fixed date, the nth weekday of a month, relative to
          Easter, a whole month or a range — each with a window you can adjust, or override for
          a single year. The calendar shows the next twelve months with an{" "}
          <b className="text-fg">order-by date</b> for each occasion: its window&rsquo;s start
          less a lead time, three weeks unless you change it.
        </p>
        <Terms
          items={[
            [
              "Readiness report",
              "Sorts upcoming occasions with no imaging into late, order now, in time and on air now, and lists imaging about to expire.",
            ],
            [
              "On its dates",
              "During its window, holiday imaging takes a share of its slot — a percentage, or exclusive, set per category.",
            ],
            [
              "Off its dates",
              "A holiday item never airs outside its dates. If no holiday item can play, the generic imaging fills in.",
            ],
            ["No holidays", "A day with no holiday items builds exactly as it did before."],
          ]}
        />
      </Section>

      <Section title="Drafting a script with AI">
        <Steps
          items={[
            <>
              In <Ui>Production › Imaging › Create &amp; schedule</Ui>, press{" "}
              <Ui>Write with AI…</Ui> beside the script box — or, in <Ui>Imaging Reads</Ui>, use{" "}
              <Ui>Draft with AI…</Ui>.
            </>,
            <>
              Choose how many drafts (one to five), a tone — hype, smooth, warm, spooky, festive
              or respectful — a length of :05, :10, :15 or :30, and any notes you want it to use.
            </>,
            <>
              Press <Ui>Draft</Ui>. Each draft shows its length and any <Ui>CHECK</Ui> flags: a
              station ID missing your legal-ID wording, or a number, day or month that is in
              neither your station facts nor your notes and may have been invented.
            </>,
            <>
              <Ui>Use this</Ui> puts a draft in the script box. If the box already holds your own
              words, the first press only warns; the second replaces them.
            </>,
            <>
              Save the way you always have — <Ui>Create item</Ui>, <Ui>Save script</Ui>,{" "}
              <Ui>Add to Imaging Reads</Ui> or <Ui>Save batch</Ui>. Drafting on its own stores
              nothing.
            </>,
          ]}
        />
      </Section>

      <Section title="What the writer is given — and told">
        <p>
          Only what your station already publishes: call letters, frequency, brand, city of
          license, market, format and legal-ID wording; the imaging type; the occasion&rsquo;s
          name (never its dates); your tone, length and notes; and a few recent reads as house
          style. Nothing about listeners or people is sent.
        </p>
        <p>
          Its instructions forbid invented events, dates, prices, contests, giveaways and
          sponsor claims, and claims about other stations. The drafts are advisory: the writer
          never sends a read anywhere and never touches the air path.
        </p>
      </Section>

      <Section title="Who can do what">
        <p>
          Producers and jocks can create imaging items, write and save scripts, compose reads
          and ask for drafts. Flight dates, marking audio received, importing it, deleting
          items, categories and the calendar stay with the program director, engineering and
          the station admin. Buttons a profile cannot use are shown disabled with the reason,
          not hidden.
        </p>
      </Section>

      <Section title="Getting reads to your imaging vendor">
        <p>
          Reads are batched in <Ui>Imaging Reads</Ui> and saved as a Word vendor sheet for your
          imaging vendor. A sender that emails that sheet from the station&rsquo;s own account
          is built in: it previews first, asks for a confirmation code that expires, and has a
          test mode that sends only to your own inbox. It stays off until your station turns it
          on, and only the program director&rsquo;s role can make a real send.
        </p>
        <Note title="Optional, and off until you set it up">
          The AI writer needs an AI key stored by the station owner. Until then its buttons are
          disabled and say exactly why. Everything else on this page works without it.
        </Note>
      </Section>
    </GuidePage>
  );
}
