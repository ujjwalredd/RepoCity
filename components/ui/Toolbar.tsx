"use client";

import { useState } from "react";
import {
  Search,
  Network,
  Route,
  Crown,
  RotateCcw,
  Table2,
  Box,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { languages } from "@/components/scene/visual";
import { runGraphQuery } from "@/lib/query-client";

export function Toolbar() {
  const graph = useStore((s) => s.graph);
  const search = useStore((s) => s.search);
  const setSearch = useStore((s) => s.setSearch);
  const languageFilter = useStore((s) => s.languageFilter);
  const setLanguageFilter = useStore((s) => s.setLanguageFilter);
  const selectedId = useStore((s) => s.selectedId);
  const setHighlight = useStore((s) => s.setHighlight);
  const clearHighlight = useStore((s) => s.clearHighlight);
  const setDistrictFilter = useStore((s) => s.setDistrictFilter);
  const viewMode = useStore((s) => s.viewMode);
  const setViewMode = useStore((s) => s.setViewMode);
  const select = useStore((s) => s.select);

  const [pathFrom, setPathFrom] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const langs = graph ? languages(graph) : [];
  const nameOf = (id: string | null) =>
    graph?.repos.find((r) => r.id === id)?.name ?? "";

  async function neighbors() {
    if (!selectedId) {
      setNote("Click a building first, then Neighbors");
      return;
    }
    setBusy("neighbors");
    setNote(null);
    try {
      const r = await runGraphQuery({ op: "neighbors", id: selectedId, k: 6 });
      setSource(r.source);
      if (r.nodeIds.length <= 1) {
        clearHighlight();
        setNote(`${nameOf(selectedId)} has no similar repos`);
      } else {
        setHighlight(r.nodeIds, r.edgeKeys);
        setNote(`${r.nodeIds.length - 1} neighbors of ${nameOf(selectedId)}`);
      }
    } finally {
      setBusy(null);
    }
  }

  async function hubs() {
    setBusy("hubs");
    setNote(null);
    try {
      const r = await runGraphQuery({ op: "hubs", top: 5 });
      setHighlight(r.nodeIds, r.edgeKeys);
      setSource(r.source);
      setNote(`Top ${r.nodeIds.length} most-connected repos`);
    } finally {
      setBusy(null);
    }
  }

  async function path() {
    if (!selectedId) {
      setNote("Click a building to set the path start");
      return;
    }
    if (!pathFrom) {
      setPathFrom(selectedId);
      setNote(`Path start: ${nameOf(selectedId)} — now pick a target`);
      return;
    }
    if (pathFrom === selectedId) {
      setNote("Pick a different target repo");
      return;
    }
    setBusy("path");
    try {
      const r = await runGraphQuery({ op: "path", from: pathFrom, to: selectedId });
      setSource(r.source);
      if (r.nodeIds.length === 0) {
        clearHighlight();
        setNote(`No similarity path between ${nameOf(pathFrom)} and ${nameOf(selectedId)}`);
      } else {
        setHighlight(r.nodeIds, r.edgeKeys);
        setNote(`Path: ${r.nodeIds.length} repos, ${r.nodeIds.length - 1} hops`);
      }
      setPathFrom(null);
    } finally {
      setBusy(null);
    }
  }

  function reset() {
    clearHighlight();
    setSearch("");
    setLanguageFilter(null);
    setDistrictFilter(null);
    setPathFrom(null);
    select(null);
    setSource(null);
    setNote(null);
  }

  const btn =
    "flex items-center gap-1.5 rounded-md border border-surface-2 bg-surface/70 px-2.5 py-1.5 text-xs text-ink transition-colors duration-200 hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40 cursor-pointer";

  return (
    <div className="pointer-events-auto absolute left-4 right-4 top-4 z-toolbar flex flex-wrap items-center gap-2 rounded-xl border border-surface-2/70 bg-surface/80 p-2.5 backdrop-blur-md">
      <div className="mr-1 flex items-center gap-2 pl-1">
        <span className="font-mono text-sm font-semibold text-ink">RepoCity</span>
        <span className="hidden font-mono text-[11px] text-muted sm:inline">
          {graph?.repos.length ?? 0} repos · {graph?.districts.length ?? 0} districts
        </span>
      </div>

      {/* search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
        <input
          aria-label="Search repositories"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search repos…"
          className="w-40 rounded-md border border-surface-2 bg-bg/60 py-1.5 pl-7 pr-2 font-sans text-xs text-ink placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </div>

      {/* language filter */}
      <label className="sr-only" htmlFor="lang">Filter by language</label>
      <select
        id="lang"
        value={languageFilter ?? ""}
        onChange={(e) => setLanguageFilter(e.target.value || null)}
        className="cursor-pointer rounded-md border border-surface-2 bg-bg/60 px-2 py-1.5 font-sans text-xs text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <option value="">All languages</option>
        {langs.map((l) => (
          <option key={l} value={l}>{l}</option>
        ))}
      </select>

      <div className="mx-1 h-5 w-px bg-surface-2" />

      {/* graph queries */}
      <button
        className={btn}
        onClick={neighbors}
        disabled={busy === "neighbors"}
        title="Select a building, then highlight its most-similar repos"
      >
        <Network className="h-3.5 w-3.5" /> Neighbors
      </button>
      <button
        className={btn}
        onClick={path}
        disabled={busy === "path"}
        title="Highlight the similarity chain between two repos"
      >
        <Route className="h-3.5 w-3.5" />
        {pathFrom ? "Path → pick target" : "Path"}
      </button>
      <button className={btn} onClick={hubs} disabled={busy === "hubs"}>
        <Crown className="h-3.5 w-3.5" /> Top hubs
      </button>

      <div className="mx-1 h-5 w-px bg-surface-2" />

      {/* view toggle */}
      <button
        className={btn}
        onClick={() => setViewMode(viewMode === "city" ? "table" : "city")}
        aria-label="Toggle data table view"
      >
        {viewMode === "city" ? <Table2 className="h-3.5 w-3.5" /> : <Box className="h-3.5 w-3.5" />}
        {viewMode === "city" ? "Table" : "City"}
      </button>
      <button className={btn} onClick={reset} aria-label="Reset view">
        <RotateCcw className="h-3.5 w-3.5" /> Reset
      </button>

      <div className="ml-auto flex items-center gap-2">
        {note && (
          <span className="max-w-[280px] truncate rounded-md border border-accent/40 bg-accent/10 px-2 py-1 font-sans text-[11px] text-ink">
            {note}
          </span>
        )}
        {source && (
          <span
            className="rounded-md border border-surface-2 px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-muted"
            title="Where the last graph query was answered"
          >
            via {source}
          </span>
        )}
      </div>
    </div>
  );
}
