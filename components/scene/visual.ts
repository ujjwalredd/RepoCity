// Derives per-repo visual state from filters + selection + query highlights.

import type { GraphData, RepoNode } from "@/lib/types";

export interface FilterState {
  search: string;
  languageFilter: string | null;
  districtFilter: number | null;
}

export function matchesFilter(r: RepoNode, f: FilterState): boolean {
  const q = f.search.trim().toLowerCase();
  if (q) {
    const hay = `${r.name} ${r.description} ${r.topics.join(" ")}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (f.languageFilter && r.language !== f.languageFilter) return false;
  if (f.districtFilter != null && r.clusterId !== f.districtFilter) return false;
  return true;
}

export function anyFilterActive(f: FilterState): boolean {
  return Boolean(f.search.trim() || f.languageFilter || f.districtFilter != null);
}

export function languages(graph: GraphData): string[] {
  const set = new Set<string>();
  for (const r of graph.repos) if (r.language) set.add(r.language);
  return [...set].sort();
}
