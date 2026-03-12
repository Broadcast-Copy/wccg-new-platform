"use client";

import { useEffect } from "react";

/**
 * Studio layout — hides footer and removes container padding
 * so the studio UI can be a full-viewport dark experience.
 */
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Hide footer and remove parent padding when studio is mounted
    const main = document.querySelector("main");
    const footer = document.querySelector("footer");
    const container = main?.querySelector(":scope > .container") as HTMLElement | null;

    if (main) {
      main.style.paddingBottom = "0";
    }
    if (container) {
      container.style.paddingTop = "0";
      container.style.paddingBottom = "0";
      container.style.maxWidth = "none";
      container.style.paddingLeft = "0";
      container.style.paddingRight = "0";
    }
    if (footer) {
      footer.style.display = "none";
    }

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

  return <>{children}</>;
}
