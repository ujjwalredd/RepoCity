// Pure graph algorithms over GraphData. Used by the API fallback when
// PuppyGraph is unavailable, and reusable on the client. PuppyGraph runs the
// same logic as Gremlin traversals against Postgres in production.

import type { GraphData } from "./types";

function adjacency(graph: GraphData) {
  const adj = new Map<string, { id: string; weight: number }[]>();
  for (const r of graph.repos) adj.set(r.id, []);
  for (const e of graph.edges) {
    adj.get(e.source)?.push({ id: e.target, weight: e.weight });
    adj.get(e.target)?.push({ id: e.source, weight: e.weight });
  }
  return adj;
}

export interface QueryResult {
  nodeIds: string[];
  edgeKeys: string[];
  meta?: Record<string, unknown>;
}

const ek = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** k nearest neighbors of a repo by similarity weight. */
export function neighbors(graph: GraphData, id: string, k = 6): QueryResult {
  const adj = adjacency(graph);
  const ns = (adj.get(id) ?? [])
    .sort((a, b) => b.weight - a.weight)
    .slice(0, k);
  return {
    nodeIds: [id, ...ns.map((n) => n.id)],
    edgeKeys: ns.map((n) => ek(id, n.id)),
    meta: { center: id, count: ns.length },
  };
}

/** Highest-degree repos — the connective hubs of the city. */
export function hubs(graph: GraphData, top = 5): QueryResult {
  const adj = adjacency(graph);
  const ranked = [...adj.entries()]
    .map(([id, ns]) => ({ id, degree: ns.length }))
    .sort((a, b) => b.degree - a.degree)
    .slice(0, top);
  const set = new Set(ranked.map((r) => r.id));
  const edgeKeys = graph.edges
    .filter((e) => set.has(e.source) && set.has(e.target))
    .map((e) => ek(e.source, e.target));
  return { nodeIds: ranked.map((r) => r.id), edgeKeys, meta: { ranked } };
}

/** Shortest path (max-similarity) between two repos via Dijkstra on 1-weight. */
export function shortestPath(
  graph: GraphData,
  from: string,
  to: string,
): QueryResult {
  const adj = adjacency(graph);
  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const pq = new Set<string>(graph.repos.map((r) => r.id));
  for (const id of pq) {
    dist.set(id, Infinity);
    prev.set(id, null);
  }
  dist.set(from, 0);

  while (pq.size) {
    let u: string | null = null;
    let best = Infinity;
    for (const id of pq) {
      const d = dist.get(id)!;
      if (d < best) {
        best = d;
        u = id;
      }
    }
    if (u === null || best === Infinity) break;
    pq.delete(u);
    if (u === to) break;
    for (const n of adj.get(u) ?? []) {
      if (!pq.has(n.id)) continue;
      // cost: invert similarity so stronger links are "shorter"
      const alt = dist.get(u)! + (1 - n.weight);
      if (alt < dist.get(n.id)!) {
        dist.set(n.id, alt);
        prev.set(n.id, u);
      }
    }
  }

  const path: string[] = [];
  let cur: string | null = to;
  while (cur) {
    path.unshift(cur);
    cur = prev.get(cur) ?? null;
  }
  if (path[0] !== from) return { nodeIds: [], edgeKeys: [], meta: { ok: false } };
  const edgeKeys: string[] = [];
  for (let i = 0; i < path.length - 1; i++) edgeKeys.push(ek(path[i], path[i + 1]));
  return { nodeIds: path, edgeKeys, meta: { ok: true, length: path.length } };
}

/** All members of a district cluster. */
export function district(graph: GraphData, clusterId: number): QueryResult {
  const ids = graph.repos
    .filter((r) => r.clusterId === clusterId)
    .map((r) => r.id);
  const set = new Set(ids);
  const edgeKeys = graph.edges
    .filter((e) => set.has(e.source) && set.has(e.target))
    .map((e) => ek(e.source, e.target));
  return { nodeIds: ids, edgeKeys, meta: { clusterId, count: ids.length } };
}
