"use client";

// Accessible, keyboard-navigable table alternative to the 3D canvas.
// Satisfies the a11y requirement that the visualization has a text equivalent.

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { matchesFilter } from "@/components/scene/visual";

export function DataTable() {
  const graph = useStore((s) => s.graph);
  const search = useStore((s) => s.search);
  const languageFilter = useStore((s) => s.languageFilter);
  const districtFilter = useStore((s) => s.districtFilter);
  const select = useStore((s) => s.select);
  const selectedId = useStore((s) => s.selectedId);

  const filter = { search, languageFilter, districtFilter };

  const rows = useMemo(() => {
    if (!graph) return [];
    const dmap = new Map(graph.districts.map((d) => [d.id, d]));
    return graph.repos
      .filter((r) => matchesFilter(r, filter))
      .sort((a, b) => b.stars - a.stars)
      .map((r) => ({ ...r, district: dmap.get(r.clusterId) }));
  }, [graph, search, languageFilter, districtFilter]);

  if (!graph) return null;

  return (
    <div className="absolute inset-0 top-[72px] z-overlay overflow-auto bg-bg p-4 pt-6">
      <div className="mx-auto max-w-5xl">
        <table className="w-full border-collapse font-sans text-sm">
          <caption className="sr-only">
            Repositories with district, language, stars, forks, and topics
          </caption>
          <thead className="sticky top-0 bg-bg">
            <tr className="border-b border-surface-2 text-left font-mono text-[11px] uppercase tracking-wide text-muted">
              <th scope="col" className="py-2 pr-4">Repo</th>
              <th scope="col" className="py-2 pr-4">District</th>
              <th scope="col" className="py-2 pr-4">Language</th>
              <th scope="col" className="py-2 pr-4 text-right">Stars</th>
              <th scope="col" className="py-2 pr-4 text-right">Forks</th>
              <th scope="col" className="py-2">Topics</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                tabIndex={0}
                onClick={() => select(r.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    select(r.id);
                  }
                }}
                className={`cursor-pointer border-b border-surface-2/40 transition-colors duration-150 hover:bg-surface focus:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  selectedId === r.id ? "bg-surface" : ""
                }`}
              >
                <td className="py-2 pr-4 font-mono text-ink">{r.name}</td>
                <td className="py-2 pr-4">
                  <span className="inline-flex items-center gap-1.5 text-muted">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: r.district?.color }}
                    />
                    {r.district?.label ?? "—"}
                  </span>
                </td>
                <td className="py-2 pr-4 text-muted">{r.language ?? "—"}</td>
                <td className="py-2 pr-4 text-right font-mono text-ink">{r.stars}</td>
                <td className="py-2 pr-4 text-right font-mono text-muted">{r.forks}</td>
                <td className="py-2 text-muted">{r.topics.join(", ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">No repos match filters.</p>
        )}
      </div>
    </div>
  );
}
