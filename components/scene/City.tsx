"use client";

import { useMemo } from "react";
import type { GraphData } from "@/lib/types";
import { useStore, edgeKey } from "@/lib/store";
import { matchesFilter, anyFilterActive } from "./visual";
import { Skyscraper } from "./Skyscraper";
import { Arc } from "./Arc";
import { Ground } from "./Ground";
import { DistrictLabels } from "./DistrictLabels";

export function City({ graph }: { graph: GraphData }) {
  const search = useStore((s) => s.search);
  const languageFilter = useStore((s) => s.languageFilter);
  const districtFilter = useStore((s) => s.districtFilter);
  const highlightedIds = useStore((s) => s.highlightedIds);
  const highlightedEdges = useStore((s) => s.highlightedEdges);
  const liveEdges = useStore((s) => s.liveEdges);

  const filter = { search, languageFilter, districtFilter };
  const filtering = anyFilterActive(filter);
  const hasHighlight = highlightedIds.size > 0;

  const districtColor = useMemo(() => {
    const m = new Map<number, string>();
    for (const d of graph.districts) m.set(d.id, d.color);
    return m;
  }, [graph.districts]);

  const repoById = useMemo(() => {
    const m = new Map<string, (typeof graph.repos)[number]>();
    for (const r of graph.repos) m.set(r.id, r);
    return m;
  }, [graph.repos]);

  // arcs come from the live PuppyGraph edge query; fall back to the snapshot
  const edges = liveEdges ?? graph.edges;

  return (
    <group>
      <Ground districts={graph.districts} />
      <DistrictLabels districts={graph.districts} />

      {graph.repos.map((r) => {
        const passesFilter = matchesFilter(r, filter);
        const inHighlight = highlightedIds.has(r.id);
        const dimmed =
          (filtering && !passesFilter) || (hasHighlight && !inHighlight);
        return (
          <Skyscraper
            key={r.id}
            repo={r}
            districtColor={districtColor.get(r.clusterId) ?? "#38BDF8"}
            dimmed={dimmed}
            highlighted={inHighlight}
          />
        );
      })}

      {edges.map((e) => {
        const ra = repoById.get(e.source);
        const rb = repoById.get(e.target);
        if (!ra || !rb) return null;
        const key = edgeKey(e.source, e.target);
        const active = highlightedEdges.has(key);
        const dimmed = (filtering || hasHighlight) && !active;
        const intra = ra.clusterId === rb.clusterId;
        // launch arcs from each building's rooftop
        const ay = ra.height + 1;
        const by = rb.height + 1;
        return (
          <Arc
            key={key}
            a={[ra.pos[0], ay, ra.pos[2]]}
            b={[rb.pos[0], by, rb.pos[2]]}
            weight={e.weight}
            active={active}
            dimmed={dimmed}
            intra={intra}
            color={districtColor.get(ra.clusterId) ?? "#38BDF8"}
            aLabel={ra.name}
            bLabel={rb.name}
          />
        );
      })}
    </group>
  );
}
