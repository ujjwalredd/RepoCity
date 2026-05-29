"use client";

import { useStore } from "@/lib/store";

// District color key (bottom-left). Color is never the sole signal — each
// district also carries a text label here and a floating label in the scene.
export function Legend() {
  const graph = useStore((s) => s.graph);
  const districtFilter = useStore((s) => s.districtFilter);
  const setDistrictFilter = useStore((s) => s.setDistrictFilter);
  if (!graph) return null;

  return (
    <div className="pointer-events-auto absolute bottom-4 left-4 z-overlay max-w-[240px] rounded-xl border border-surface-2/70 bg-surface/80 p-3 backdrop-blur-md">
      <h2 className="mb-2 font-mono text-[10px] uppercase tracking-wide text-muted">
        Districts
      </h2>
      <ul className="flex flex-col gap-1">
        {graph.districts.map((d) => {
          const active = districtFilter === d.id;
          return (
            <li key={d.id}>
              <button
                onClick={() => setDistrictFilter(active ? null : d.id)}
                aria-pressed={active}
                className={`flex w-full cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-left font-sans text-xs transition-colors duration-200 hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  active ? "bg-surface-2 text-ink" : "text-muted"
                }`}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ background: d.color }}
                />
                <span className="truncate">{d.label}</span>
                <span className="ml-auto font-mono opacity-60">{d.memberIds.length}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <h2 className="mb-1.5 mt-3 border-t border-surface-2/50 pt-2.5 font-mono text-[10px] uppercase tracking-wide text-muted">
        Legend
      </h2>
      <ul className="flex flex-col gap-1.5 font-sans text-[11px] text-muted">
        <li className="flex items-center gap-2">
          <span className="inline-block h-3 w-2 shrink-0 rounded-sm bg-gradient-to-t from-surface-2 to-ink/70" />
          Building = repo · height = stars
        </li>
        <li className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-edge-from/60 bg-edge-from/20" />
          District = semantic cluster
        </li>
        <li className="flex items-center gap-2">
          <span className="inline-block h-0.5 w-5 shrink-0 rounded bg-muted" />
          Arc = semantic similarity
        </li>
        <li className="flex items-center gap-2 pl-1">
          <span className="inline-block h-0.5 w-5 shrink-0 rounded" style={{ background: "linear-gradient(90deg,#38BDF8,#818CF8)" }} />
          <span className="text-[10px]">cross-cluster bridge</span>
        </li>
        <li className="flex items-center gap-2 pl-1">
          <span className="inline-block h-0.5 w-5 shrink-0 rounded bg-emerald-300/70" />
          <span className="text-[10px]">same-cluster (district hue)</span>
        </li>
      </ul>
      <p className="mt-2 text-[10px] leading-snug text-muted/70">
        Hover an arc for the two repos + similarity %. Click a building to explore its links.
      </p>
    </div>
  );
}
