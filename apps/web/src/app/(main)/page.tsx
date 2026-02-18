import { Hero } from "@/components/home/hero";
import { LiveNowRail } from "@/components/home/live-now-rail";
import { UpNextRail } from "@/components/home/up-next-rail";

export default function HomePage() {
  return (
    <div className="space-y-12">
      <Hero />
      <LiveNowRail />
      <UpNextRail />
    </div>
  );
}
