"use client";

import { useEffect, useRef } from "react";
import { ExternalLink, X, Star, GitFork, Network } from "lucide-react";
import gsap from "gsap";
import { useStore } from "@/lib/store";
import { runGraphQuery } from "@/lib/query-client";

export function SidePanel() {
  const panelRef = useRef<HTMLElement>(null);
  const graph = useStore((s) => s.graph);
  const selectedId = useStore((s) => s.selectedId);
  const select = useStore((s) => s.select);
  const reducedMotion = useStore((s) => s.reducedMotion);
  const setHighlight = useStore((s) => s.setHighlight);

  const repo = graph?.repos.find((r) => r.id === selectedId) ?? null;
  const district = graph?.districts.find((d) => d.id === repo?.clusterId);

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const open = Boolean(repo);
    if (reducedMotion) {
      gsap.set(el, { xPercent: open ? 0 : 105 });
      return;
    }
    gsap.to(el, {
      xPercent: open ? 0 : 105,
      duration: 0.25,
      ease: open ? "power3.out" : "power3.in",
    });
  }, [repo, reducedMotion]);

  async function highlightNeighbors() {
    if (!repo) return;
    const r = await runGraphQuery({ op: "neighbors", id: repo.id, k: 6 });
    setHighlight(r.nodeIds, r.edgeKeys);
  }

  return (
    <aside
      ref={panelRef}
      style={{ transform: "translateX(105%)" }}
      className="pointer-events-auto absolute right-4 top-24 bottom-4 z-panel flex w-[340px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-surface-2/70 bg-surface/85 backdrop-blur-md"
      aria-hidden={!repo}
    >
      {repo && (
        <>
          <header className="flex items-start justify-between gap-2 border-b border-surface-2/60 p-4">
            <div className="min-w-0">
              <h2 className="truncate font-mono text-base font-semibold text-ink">
                {repo.name}
              </h2>
              {district && (
                <span
                  className="mt-1 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide"
                  style={{ color: district.color }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: district.color }} />
                  {district.label}
                </span>
              )}
            </div>
            <button
              onClick={() => select(null)}
              aria-label="Close panel"
              className="cursor-pointer rounded-md p-1 text-muted transition-colors duration-200 hover:bg-surface-2 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="mb-4 flex gap-4 font-mono text-xs text-muted">
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-accent" /> {repo.stars}
              </span>
              <span className="flex items-center gap-1">
                <GitFork className="h-3.5 w-3.5" /> {repo.forks}
              </span>
              {repo.language && (
                <span className="rounded bg-surface-2 px-1.5 py-0.5">{repo.language}</span>
              )}
            </div>

            {repo.description && (
              <p className="mb-4 text-sm leading-relaxed text-ink/90">{repo.description}</p>
            )}

            {repo.topics.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-1.5">
                {repo.topics.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-surface-2 px-2 py-0.5 font-mono text-[10px] text-muted"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            {repo.readmeExcerpt && (
              <div className="mb-4">
                <h3 className="mb-1.5 font-mono text-[11px] uppercase tracking-wide text-muted">
                  README
                </h3>
                <p className="text-xs leading-relaxed text-muted">{repo.readmeExcerpt}…</p>
              </div>
            )}
          </div>

          <footer className="flex flex-col gap-2 border-t border-surface-2/60 p-4">
            <button
              onClick={highlightNeighbors}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-bg transition-colors duration-200 hover:bg-accent/85 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
            >
              <Network className="h-4 w-4" /> Highlight neighbors
            </button>
            <a
              href={repo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-surface-2 px-3 py-2 text-sm text-ink transition-colors duration-200 hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <ExternalLink className="h-4 w-4" /> View on GitHub
            </a>
          </footer>
        </>
      )}
    </aside>
  );
}
