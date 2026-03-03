"use client";

import { AppImage as Image } from "@/components/ui/app-image";

interface ThemeLogoProps {
  width?: number;
  className?: string;
  priority?: boolean;
}

/**
 * Renders two logo images wrapped in spans that swap visibility via CSS
 * `dark:` classes. Wrapper-based approach avoids Next.js Image issues.
 *
 * - Light mode: full "WCCG 104.5FM THE HIP HOP STATION" logo (black text)
 * - Dark mode: red "104.5FM" logo (works on dark backgrounds)
 */
export function ThemeLogo({
  width = 120,
  className = "",
  priority = false,
}: ThemeLogoProps) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      {/* Light mode logo — wrapper hidden when .dark is active */}
      <span className="block dark:hidden">
        <Image
          src="/images/logos/wccg-logo-black.png"
          alt="WCCG 104.5 FM — The Hip Hop Station"
          width={500}
          height={324}
          style={{ width: `${width}px`, height: "auto" }}
          priority={priority}
        />
      </span>
      {/* Dark mode logo — wrapper hidden by default, shown when .dark */}
      <span className="hidden dark:block">
        <Image
          src="/images/logos/1045fm-logo.png"
          alt="WCCG 104.5 FM"
          width={500}
          height={324}
          style={{ width: `${width}px`, height: "auto" }}
          priority={priority}
        />
      </span>
    </span>
  );
}
