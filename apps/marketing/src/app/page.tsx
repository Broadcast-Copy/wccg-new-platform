import { ArrowRight, Check, Radio } from "lucide-react";
import { EarlyAccessForm } from "@/components/early-access-form";
import {
  ADD_ONS,
  FAQS,
  FEATURES,
  ON_DEMAND_FEATURE,
  PLANS,
  STATS,
} from "@/content";
import { FLAGSHIP_URL } from "@/lib/site";

const ALL_FEATURES = [...FEATURES, ON_DEMAND_FEATURE];

const STEPS = [
  {
    n: "01",
    title: "We provision your station",
    body: "You get an organization and a licensed station record, your own domain, and your team invited as GM, OM, staff and DJs.",
  },
  {
    n: "02",
    title: "Bring your streams and programming",
    body: "Point us at your existing stream mounts. We import your shows, hosts and weekly grid — your schedule becomes the source of truth.",
  },
  {
    n: "03",
    title: "Run it agentically",
    body: "Agents draft the copy, build the spots, keep the public file current and surface what needs a human. You run the station, not the software.",
  },
] as const;

export default function Page() {
  return (
    <div className="min-h-screen">
      {/* ---------------------------------------------------------- nav */}
      <header className="sticky top-0 z-50 border-b border-line/70 bg-ink/80 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <a href="#top" className="flex items-center gap-2 font-semibold tracking-tight">
            <Radio className="h-5 w-5 text-signal" aria-hidden />
            Broadcast&nbsp;Copy
          </a>
          <div className="hidden items-center gap-7 text-sm text-dim md:flex">
            <a className="transition hover:text-fg" href="#platform">Platform</a>
            <a className="transition hover:text-fg" href="#pricing">Pricing</a>
            <a className="transition hover:text-fg" href="#faq">FAQ</a>
            <a
              className="transition hover:text-fg"
              href={FLAGSHIP_URL}
              target="_blank"
              rel="noreferrer"
            >
              See it live
            </a>
          </div>
          <a
            href="#early-access"
            className="rounded-lg bg-signal px-4 py-2 text-sm font-semibold text-white transition hover:bg-signal-soft"
          >
            Get early access
          </a>
        </nav>
      </header>

      {/* -------------------------------------------------------- hero */}
      <section id="top" className="relative overflow-hidden bc-glow">
        <div className="pointer-events-none absolute inset-0 bc-grid" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-5 pt-20 pb-16 text-center sm:pt-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-signal/30 bg-signal/10 px-3.5 py-1.5 text-xs font-medium tracking-wide text-signal-soft uppercase">
            <span className="bc-pulse h-1.5 w-1.5 rounded-full bg-signal" aria-hidden />
            Live on air today
          </span>

          <h1 className="mx-auto mt-7 max-w-4xl text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-6xl">
            The operating system for modern radio.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-dim text-pretty">
            Broadcast Copy runs your FCC station end to end — streaming,
            programming, DJ operations, listener loyalty, compliance and ad sales
            — with an agentic layer that handles the busywork.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#early-access"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-signal px-6 py-3 text-sm font-semibold text-white transition hover:bg-signal-soft sm:w-auto"
            >
              Get early access <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
            <a
              href={FLAGSHIP_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center rounded-lg border border-line bg-elevated px-6 py-3 text-sm font-semibold transition hover:border-dim/40 sm:w-auto"
            >
              See a real station
            </a>
          </div>

          <p className="mt-6 text-sm text-faint">
            $49.99/mo per licensed station · free to create an account
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------- proof */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-10">
          <p className="text-center text-xs tracking-[0.2em] text-faint uppercase">
            Running in production at WCCG 104.5 FM · Fayetteville, NC
          </p>
          <dl className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <dt className="sr-only">{stat.label}</dt>
                <dd>
                  <span className="block text-3xl font-semibold tracking-tight sm:text-4xl">
                    {stat.value}
                  </span>
                  <span className="mt-1 block text-sm text-dim">{stat.label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ---------------------------------------------------- platform */}
      <section id="platform" className="mx-auto max-w-6xl px-5 py-24">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Everything a station actually runs on.
          </h2>
          <p className="mt-4 text-lg text-dim text-pretty">
            Not a website with a player bolted on. The whole operation — the air
            product, the back office and the compliance file — in one system.
          </p>
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-5">
          {ALL_FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.name}
                className="w-full rounded-2xl border border-line bg-surface p-6 transition hover:border-signal/30 sm:w-[calc(50%-0.625rem)] lg:w-[calc(33.333%-0.834rem)]"
              >
                <Icon className="h-6 w-6 text-signal" aria-hidden />
                <h3 className="mt-4 font-semibold">{feature.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-dim">
                  {feature.blurb}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------------------- steps */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-24">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            You are not left alone with a setup wizard.
          </h2>
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {STEPS.map((step) => (
              <li key={step.n} className="border-t border-line pt-6">
                <span className="font-mono text-sm text-signal">{step.n}</span>
                <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-dim">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ----------------------------------------------------- pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-5 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Priced per station, not per seat.
          </h2>
          <p className="mt-4 text-lg text-dim text-pretty">
            Create an account free. Pay only for the licensed stations you
            actually put on the platform.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={
                plan.featured
                  ? "relative rounded-2xl border border-signal/50 bg-elevated p-7 shadow-[0_0_60px_-15px] shadow-signal/30"
                  : "rounded-2xl border border-line bg-surface p-7"
              }
            >
              {plan.featured && (
                <span className="absolute -top-3 left-7 rounded-full bg-signal px-3 py-1 text-xs font-semibold text-white">
                  Most stations
                </span>
              )}
              <h3 className="font-semibold">{plan.name}</h3>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-semibold tracking-tight">
                  {plan.price}
                </span>
              </div>
              <p className="mt-1 text-sm text-faint">{plan.cadence}</p>
              <p className="mt-4 text-sm text-dim">{plan.tagline}</p>
              <ul className="mt-6 space-y-3">
                {plan.points.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-signal" aria-hidden />
                    <span className="text-dim">{point}</span>
                  </li>
                ))}
              </ul>
              <a
                href="#early-access"
                className={
                  plan.featured
                    ? "mt-8 block rounded-lg bg-signal px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-signal-soft"
                    : "mt-8 block rounded-lg border border-line px-5 py-3 text-center text-sm font-semibold transition hover:border-dim/40"
                }
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-line bg-surface p-7">
          <h3 className="text-sm font-semibold tracking-wide text-dim uppercase">
            Add-ons
          </h3>
          <div className="mt-5 grid gap-6 md:grid-cols-3">
            {ADD_ONS.map((addOn) => (
              <div key={addOn.name}>
                <p className="font-medium">{addOn.name}</p>
                <p className="mt-1 text-sm text-signal">{addOn.price}</p>
                <p className="mt-2 text-sm text-dim">{addOn.blurb}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- faq */}
      <section id="faq" className="border-t border-line bg-surface">
        <div className="mx-auto max-w-3xl px-5 py-24">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Questions we get from GMs.
          </h2>
          <dl className="mt-12 space-y-8">
            {FAQS.map((faq) => (
              <div key={faq.q} className="border-t border-line pt-6">
                <dt className="font-medium">{faq.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-dim">{faq.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ------------------------------------------------ early access */}
      <section id="early-access" className="mx-auto max-w-6xl px-5 py-24">
        <div className="grid gap-14 lg:grid-cols-2 lg:items-start">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Put your station on Broadcast Copy.
            </h2>
            <p className="mt-4 text-lg text-dim text-pretty">
              We&rsquo;re onboarding a small group of licensed stations personally.
              Tell us about yours and we&rsquo;ll walk you through what moving
              over actually looks like.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-dim">
              {[
                "A working station on day one, not a blank tenant",
                "Your programming and hosts imported for you",
                "Your existing stream host stays where it is",
                "Per-station data isolation enforced in the database",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-signal" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
            <EarlyAccessForm />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ footer */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 text-sm text-faint sm:flex-row">
          <p className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-signal" aria-hidden />
            Broadcast Copy
          </p>
          <p>
            Flagship:{" "}
            <a
              className="text-dim transition hover:text-fg"
              href={FLAGSHIP_URL}
              target="_blank"
              rel="noreferrer"
            >
              WCCG 104.5 FM
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
