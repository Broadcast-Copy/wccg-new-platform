"use client";

import { Printer } from "lucide-react";

/** Prints the current page. Hidden from the printout itself. */
export function PrintButton({ label = "Print or save as PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-lg border border-line bg-elevated px-4 py-2 text-sm font-semibold transition hover:border-dim/40 print:hidden"
    >
      <Printer className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}
