import { SiteHeader } from "@/components/site-header";

/**
 * The interactive station model, full-bleed under a thin bar.
 *
 * The model itself is a self-contained WebGL page under /public/dollhouse, so
 * it works with `output: 'export'` and needs no Three.js dependency in this
 * app's build. Shared by the home page and the older /tour URL.
 */
export function StationTour() {
  return (
    <div className="flex h-screen flex-col">
      <SiteHeader sticky={false} />

      <iframe
        src="/dollhouse/?embed=1"
        title="Interactive 3D model of a radio station, room by room"
        className="w-full flex-1 border-0"
      />
    </div>
  );
}
