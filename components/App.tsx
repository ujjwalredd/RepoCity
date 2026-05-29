"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useStore } from "@/lib/store";
import type { GraphData } from "@/lib/types";
import { fetchEdges } from "@/lib/query-client";
import { Toolbar } from "@/components/ui/Toolbar";
import { SidePanel } from "@/components/ui/SidePanel";
import { Legend } from "@/components/ui/Legend";
import { Loader } from "@/components/ui/Loader";
import { DataTable } from "@/components/ui/DataTable";

// three.js is heavy + browser-only — keep it out of the server bundle.
const Scene = dynamic(() => import("@/components/scene/Scene"), {
  ssr: false,
  loading: () => <Loader />,
});

export function App() {
  const setGraph = useStore((s) => s.setGraph);
  const setLiveEdges = useStore((s) => s.setLiveEdges);
  const setError = useStore((s) => s.setError);
  const setReducedMotion = useStore((s) => s.setReducedMotion);
  const loading = useStore((s) => s.loading);
  const error = useStore((s) => s.error);
  const graph = useStore((s) => s.graph);
  const viewMode = useStore((s) => s.viewMode);
  const select = useStore((s) => s.select);
  const clearHighlight = useStore((s) => s.clearHighlight);

  // load snapshot
  useEffect(() => {
    let alive = true;
    fetch("/api/repos")
      .then((r) => {
        if (!r.ok) throw new Error("snapshot unavailable");
        return r.json();
      })
      .then((g: GraphData) => {
        if (!alive) return;
        setGraph(g);
        // every rendered arc comes from a live graph query (PuppyGraph → fallback)
        fetchEdges()
          .then((r) => alive && setLiveEdges(r.edges, r.source))
          .catch(() => alive && setLiveEdges(g.edges, "snapshot"));
      })
      .catch((e) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
  }, [setGraph, setLiveEdges, setError]);

  // honor reduced-motion preference (live)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const on = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [setReducedMotion]);

  // keyboard: Esc clears selection + highlights, arrows cycle repos
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        select(null);
        clearHighlight();
        return;
      }
      if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && graph) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
        const ids = graph.repos.map((r) => r.id);
        const cur = useStore.getState().selectedId;
        const idx = cur ? ids.indexOf(cur) : -1;
        const next =
          e.key === "ArrowRight"
            ? ids[(idx + 1) % ids.length]
            : ids[(idx - 1 + ids.length) % ids.length];
        select(next);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [graph, select, clearHighlight]);

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      {error ? (
        <div className="absolute inset-0 z-modal flex flex-col items-center justify-center gap-2 p-8 text-center">
          <p className="font-mono text-sm text-ink">Could not load graph data.</p>
          <p className="max-w-md text-xs text-muted">
            Run <code className="rounded bg-surface px-1">npx tsx scripts/gen-sample.ts</code>{" "}
            for sample data, or <code className="rounded bg-surface px-1">npm run ingest</code>{" "}
            to pull your GitHub repos.
          </p>
        </div>
      ) : (
        <>
          {viewMode === "city" ? <Scene /> : <DataTable />}
          {loading && <Loader />}
          {graph && (
            <>
              <Toolbar />
              <SidePanel />
              {viewMode === "city" && <Legend />}
            </>
          )}
        </>
      )}
    </main>
  );
}
