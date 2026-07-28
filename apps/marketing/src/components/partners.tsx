/**
 * Partners marquee.
 *
 * Logos scroll continuously: the row is rendered twice and the track is
 * translated by exactly half its width, so the loop is seamless with no
 * JavaScript. Each slot is a fixed height with `w-auto`, which is what keeps a
 * wide mark and a square one both correct — nothing is stretched to fill a box.
 * The edges fade out so logos enter and leave rather than being clipped.
 *
 * To add a partner: drop a black-on-transparent SVG (or PNG) into
 * public/partners/ and add a line below. `mark` is the fallback used when
 * there's no file yet — it sets the name in type rather than faking a logo.
 */
type Partner = {
  name: string;
  place?: string;
  /** path under /partners, e.g. "wccg.svg" — omit to use the type fallback */
  file?: string;
};

const PARTNERS: Partner[] = [
  { name: "WCCG 104.5 FM", place: "Fayetteville, NC" },
];

function Mark({ p }: { p: Partner }) {
  if (p.file) {
    return (
      <img
        src={`/partners/${p.file}`}
        alt={p.name}
        /* fixed height, automatic width — never stretched to a box */
        className="h-9 w-auto opacity-70 transition group-hover:opacity-100"
        loading="lazy"
      />
    );
  }
  return (
    <span className="flex flex-col items-center leading-none">
      <span className="text-lg font-extrabold tracking-tight whitespace-nowrap">
        {p.name}
      </span>
      {p.place ? (
        <span className="mt-1 text-[10px] tracking-[0.22em] text-faint uppercase">
          {p.place}
        </span>
      ) : null}
    </span>
  );
}

export function Partners() {
  const row = [...PARTNERS, ...PARTNERS, ...PARTNERS, ...PARTNERS];
  return (
    <section className="border-y border-line bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <p className="text-center text-xs tracking-[0.24em] text-faint uppercase">
          Partners
        </p>

        <div className="bc-marquee mt-8">
          <div className="bc-marquee-track">
            {[0, 1].map((copy) => (
              <div key={copy} className="bc-marquee-row" aria-hidden={copy === 1}>
                {row.map((p, i) => (
                  <span key={`${copy}-${i}`} className="group text-fg/80">
                    <Mark p={p} />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
