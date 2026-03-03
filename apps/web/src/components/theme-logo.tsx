"use client";

import Image from "next/image";

interface ThemeLogoProps {
  width?: number;
  className?: string;
  priority?: boolean;
}

/**
 * Renders two logo images and uses CSS `dark:` classes to swap between them.
 * - Light mode: full "WCCG 104.5FM THE HIP HOP STATION" logo (black text)
 * - Dark mode: red "104.5FM" logo (works on dark backgrounds)
 *
 * Pure CSS swap avoids hydration mismatches from useTheme().
 */
export function ThemeLogo({
  width = 120,
  className = "",
  priority = false,
}: ThemeLogoProps) {
  return (
    <span className={`relative inline-flex items-center ${className}`}>
      {/* Light mode logo — hidden when .dark is active */}
      <Image
        src="/images/logos/wccg-logo-black.png"
        alt="WCCG 104.5 FM — The Hip Hop Station"
        width={500}
        height={324}
        className={`dark:hidden`}
        style={{ width: `${width}px`, height: "auto" }}
        priority={priority}
      />
      {/* Dark mode logo — only shown when .dark is active */}
      <Image
        src="/images/logos/1045fm-logo.png"
        alt="WCCG 104.5 FM"
        width={500}
        height={324}
        className={`hidden dark:block`}
        style={{ width: `${width}px`, height: "auto" }}
        priority={priority}
      />
    </span>
  );
}
