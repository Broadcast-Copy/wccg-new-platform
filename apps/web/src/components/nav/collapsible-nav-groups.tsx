"use client";

import { Fragment, useSyncExternalStore, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { groupNav, type RoleNavItem } from "@/lib/role-nav";

/**
 * Renders a role nav list as collapsible, section-headed groups. Leading items
 * with no `section` (the pinned links like Dashboard / Messages) render flat and
 * always-visible; each section (Create, Publish, Library, Grow, Account, and the
 * vendor sections) becomes a header you can collapse. Open/closed state persists
 * per section in localStorage so it sticks across navigation and reloads.
 *
 * Each sidebar passes its own `renderItem` so link styling stays owned by the
 * caller — this component only owns the grouping + collapse behaviour.
 */
export function CollapsibleNavGroups({
  items,
  renderItem,
}: {
  items: RoleNavItem[];
  renderItem: (item: RoleNavItem) => ReactNode;
}) {
  return (
    <>
      {groupNav(items).map((group) =>
        group.section ? (
          <NavGroup key={group.section} label={group.section}>
            {group.items.map(renderItem)}
          </NavGroup>
        ) : (
          <Fragment key="_pinned">{group.items.map(renderItem)}</Fragment>
        ),
      )}
    </>
  );
}

// Collapse state lives in localStorage so it persists across navigation +
// reloads. useSyncExternalStore keeps SSR/hydration correct (the server snapshot
// is always "open", matching the static HTML) and avoids setState-in-an-effect.
// The native `storage` event only fires in OTHER tabs, so toggle() dispatches a
// synthetic one to re-render the current tab.
function subscribe(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function NavGroup({ label, children }: { label: string; children: ReactNode }) {
  const storageKey = `wccg:navsec:${label}`;
  const open = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(storageKey) !== "0";
      } catch {
        return true;
      }
    },
    () => true, // server / first paint: expanded
  );

  const toggle = () => {
    try {
      localStorage.setItem(storageKey, open ? "0" : "1");
    } catch {
      /* localStorage unavailable — no-op */
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new StorageEvent("storage", { key: storageKey }));
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-lg px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 transition-colors hover:text-muted-foreground"
      >
        <span>{label}</span>
        <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && <div className="flex flex-col gap-0.5">{children}</div>}
    </div>
  );
}
