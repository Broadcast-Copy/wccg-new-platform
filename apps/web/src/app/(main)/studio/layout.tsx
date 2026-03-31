"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Studio layout — hides footer, removes container padding,
 * and adds a floating "← Studio" back button.
 */
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const main = document.querySelector("main");
    const footer = document.querySelector("footer");
    const container = main?.querySelector(":scope > .container") as HTMLElement | null;

    if (main) main.style.paddingBottom = "0";
    if (container) {
      container.style.paddingTop = "0";
      container.style.paddingBottom = "0";
      container.style.maxWidth = "none";
      container.style.paddingLeft = "0";
      container.style.paddingRight = "0";
    }
    if (footer) footer.style.display = "none";

    return () => {
      if (main) main.style.paddingBottom = "";
      if (container) {
        container.style.paddingTop = "";
        container.style.paddingBottom = "";
        container.style.maxWidth = "";
        container.style.paddingLeft = "";
        container.style.paddingRight = "";
      }
      if (footer) footer.style.display = "";
    };
  }, []);

  return (
    <>
      {/* Floating back button — always visible */}
      <Link
        href="/my/studio"
        className="fixed top-[70px] left-3 z-50 flex items-center gap-1.5 rounded-full bg-card/90 backdrop-blur-sm border border-border shadow-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-[#74ddc7]/40 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Studio
      </Link>
      {children}
    </>
  );
}
