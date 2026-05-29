"use client";

import { create } from "zustand";
import type { GraphData, SimilarityEdge } from "./types";

export type ViewMode = "city" | "table";
export type EdgeSource = "puppygraph" | "snapshot" | null;

interface AppState {
  graph: GraphData | null;
  loading: boolean;
  error: string | null;

  /** edges actually rendered — fetched live from PuppyGraph on load */
  liveEdges: SimilarityEdge[] | null;
  edgeSource: EdgeSource;

  selectedId: string | null;
  hoveredId: string | null;
  /** ids highlighted by a graph query (neighbors / path / hubs) */
  highlightedIds: Set<string>;
  /** edge keys "src|dst" highlighted by a query */
  highlightedEdges: Set<string>;

  search: string;
  languageFilter: string | null;
  districtFilter: number | null;
  viewMode: ViewMode;
  reducedMotion: boolean;

  setGraph: (g: GraphData) => void;
  setLiveEdges: (e: SimilarityEdge[], src: EdgeSource) => void;
  setLoading: (b: boolean) => void;
  setError: (e: string | null) => void;
  select: (id: string | null) => void;
  hover: (id: string | null) => void;
  setHighlight: (ids: string[], edges?: string[]) => void;
  clearHighlight: () => void;
  setSearch: (s: string) => void;
  setLanguageFilter: (l: string | null) => void;
  setDistrictFilter: (d: number | null) => void;
  setViewMode: (m: ViewMode) => void;
  setReducedMotion: (b: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  graph: null,
  loading: true,
  error: null,
  liveEdges: null,
  edgeSource: null,
  selectedId: null,
  hoveredId: null,
  highlightedIds: new Set(),
  highlightedEdges: new Set(),
  search: "",
  languageFilter: null,
  districtFilter: null,
  viewMode: "city",
  reducedMotion: false,

  setGraph: (g) => set({ graph: g, loading: false }),
  setLiveEdges: (e, src) => set({ liveEdges: e, edgeSource: src }),
  setLoading: (b) => set({ loading: b }),
  setError: (e) => set({ error: e, loading: false }),
  select: (id) => set({ selectedId: id }),
  hover: (id) => set({ hoveredId: id }),
  setHighlight: (ids, edges = []) =>
    set({ highlightedIds: new Set(ids), highlightedEdges: new Set(edges) }),
  clearHighlight: () =>
    set({ highlightedIds: new Set(), highlightedEdges: new Set() }),
  setSearch: (s) => set({ search: s }),
  setLanguageFilter: (l) => set({ languageFilter: l }),
  setDistrictFilter: (d) => set({ districtFilter: d }),
  setViewMode: (m) => set({ viewMode: m }),
  setReducedMotion: (b) => set({ reducedMotion: b }),
}));

export const edgeKey = (a: string, b: string) =>
  a < b ? `${a}|${b}` : `${b}|${a}`;
