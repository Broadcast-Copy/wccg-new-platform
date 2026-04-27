import { Sparkles } from "lucide-react";

export default function WikiIndexPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-6 py-10">
      <header className="space-y-3">
        <p className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          <Sparkles className="h-3 w-3 text-[#74ddc7]" />
          WCCG Wiki
        </p>
        <h1 className="text-4xl font-black tracking-tight text-foreground md:text-5xl">
          A living encyclopedia of WCCG.
        </h1>
        <p className="text-base text-muted-foreground">
          Auto-researched. Human-reviewed. Cited line by line. The wiki opens in Phase C — every artist on air, every host, every place in our footprint, with a page that grows as the world changes.
        </p>
      </header>
    </article>
  );
}
