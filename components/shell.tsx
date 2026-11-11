"use client";

import { useState, type ReactNode } from "react";

// The one layout every analysis renders into. Column positions and widths are
// fixed here and nowhere else: later phases fill the columns, they don't move
// them. The detail pane is a real column, not an overlay, so opening it never
// covers the map.
export function Shell({ rail, map, detail }: { rail?: ReactNode; map?: ReactNode; detail?: ReactNode }) {
  const [mobileTab, setMobileTab] = useState<"categories" | "map" | "details">("map");
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex border-b border-line bg-surface px-3 py-2 lg:hidden" role="tablist" aria-label="Analysis panels">
        {(["categories", "map", "details"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={mobileTab === tab}
            onClick={() => setMobileTab(tab)}
            className={`min-h-10 flex-1 rounded-lg text-[11px] font-semibold uppercase tracking-wide ${mobileTab === tab ? "bg-accent-soft text-accent" : "text-fg-muted"}`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[11rem_minmax(0,1fr)_20rem]">
      <nav aria-label="Categories" className={`${mobileTab === "categories" ? "block" : "hidden"} min-h-0 overflow-y-auto border-r border-line bg-surface/80 lg:block`}>
        {rail}
      </nav>
      <section aria-label="Map" className={`${mobileTab === "map" ? "block" : "hidden"} relative min-h-0 min-w-0 bg-canvas lg:block`}>
        {map}
      </section>
      <aside aria-label="Details" className={`${mobileTab === "details" ? "block" : "hidden"} min-h-0 overflow-y-auto border-l border-line bg-surface/80 lg:block`}>
        {detail}
      </aside>
      </div>
    </div>
  );
}
