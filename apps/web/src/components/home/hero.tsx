import { Button } from "@/components/ui/button";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary to-primary/80 px-6 py-16 text-primary-foreground md:px-12 md:py-24">
      <div className="relative z-10 max-w-2xl space-y-4">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          WCCG 104.5 FM
        </h1>
        <p className="text-lg text-primary-foreground/80">
          Your community radio station. Listen live, discover shows, earn
          rewards, and connect with your favorite hosts.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" size="lg" asChild>
            <Link href="/channels">Listen Now</Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
            asChild
          >
            <Link href="/schedule">View Schedule</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
