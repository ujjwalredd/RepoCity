// Shared graph assembly: clustering, similarity edges, and city layout.
// Consumed by ingest.ts (real GitHub data) and gen-sample.ts (synthetic).

import type { GraphData, RepoNode, SimilarityEdge, District } from "../lib/types";

export interface RawRepo {
  id: string;
  name: string;
  description: string;
  language: string | null;
  stars: number;
  forks: number;
  topics: string[];
  url: string;
  avatar: string | null;
  readmeExcerpt: string;
  embedding: number[];
}

// ---- vector math ----------------------------------------------------------

function dot(a: number[], b: number[]) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}
function norm(a: number[]) {
  return Math.sqrt(dot(a, a)) || 1e-9;
}
export function cosine(a: number[], b: number[]) {
  return dot(a, b) / (norm(a) * norm(b));
}

// ---- k-means (cosine, deterministic seed) ---------------------------------

function kmeans(vectors: number[][], k: number, iters = 50): number[] {
  const n = vectors.length;
  k = Math.max(1, Math.min(k, n));
  const dim = vectors[0].length;
  // deterministic k-means++-ish seed using a fixed PRNG
  let seed = 1337;
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const centroids: number[][] = [];
  centroids.push(vectors[Math.floor(rng() * n)].slice());
  while (centroids.length < k) {
    const d = vectors.map((v) =>
      Math.min(...centroids.map((c) => 1 - cosine(v, c))),
    );
    const sum = d.reduce((a, b) => a + b, 0) || 1;
    let r = rng() * sum;
    let idx = 0;
    while (r > 0 && idx < n - 1) r -= d[idx++];
    centroids.push(vectors[idx].slice());
  }

  const assign = new Array(n).fill(0);
  for (let it = 0; it < iters; it++) {
    let changed = false;
    for (let i = 0; i < n; i++) {
      let best = 0;
      let bestSim = -Infinity;
      for (let c = 0; c < k; c++) {
        const sim = cosine(vectors[i], centroids[c]);
        if (sim > bestSim) {
          bestSim = sim;
          best = c;
        }
      }
      if (assign[i] !== best) {
        assign[i] = best;
        changed = true;
      }
    }
    for (let c = 0; c < k; c++) {
      const members = vectors.filter((_, i) => assign[i] === c);
      if (!members.length) continue;
      const mean = new Array(dim).fill(0);
      for (const m of members) for (let d = 0; d < dim; d++) mean[d] += m[d];
      for (let d = 0; d < dim; d++) mean[d] /= members.length;
      centroids[c] = mean;
    }
    if (!changed) break;
  }
  return assign;
}

// ---- city layout ----------------------------------------------------------

const DISTRICT_PALETTE = [
  "#38BDF8", "#818CF8", "#22C55E", "#F472B6", "#FB923C",
  "#A78BFA", "#2DD4BF", "#FACC15", "#F87171", "#60A5FA",
];

const titleCase = (s: string) =>
  s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// Ranked label candidates for one cluster: distinctive topics first, then
// language, then the flagship (highest-star) repo name.
function labelCandidates(repos: RawRepo[], ids: string[]): string[] {
  const members = ids.map((id) => repos.find((x) => x.id === id)!);
  const topicCounts = new Map<string, number>();
  for (const r of members) for (const t of r.topics) topicCounts.set(t, (topicCounts.get(t) ?? 0) + 1);
  const topics = [...topicCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => titleCase(t));

  const langCounts = new Map<string, number>();
  for (const r of members) if (r.language) langCounts.set(r.language, (langCounts.get(r.language) ?? 0) + 1);
  const langs = [...langCounts.entries()].sort((a, b) => b[1] - a[1]).map(([l]) => l);

  const flagship = [...members].sort((a, b) => b.stars - a.stars)[0];
  return [...topics, ...langs, flagship ? titleCase(flagship.name) : "District"];
}

// Assigns a distinct label to every district, falling back through candidates
// so clusters that share a dominant language don't all collapse to one name.
function assignLabels(repos: RawRepo[], districts: District[]): void {
  const used = new Set<string>();
  // larger districts pick first
  const order = [...districts].sort((a, b) => b.memberIds.length - a.memberIds.length);
  for (const d of order) {
    const cands = labelCandidates(repos, d.memberIds);
    let label = cands.find((c) => !used.has(c.toLowerCase())) ?? `District ${d.id + 1}`;
    used.add(label.toLowerCase());
    d.label = label;
  }
}

// Manhattan grid: a single rectangular street grid. Repos are ordered by
// cluster so each district occupies a contiguous run of lots → neighborhoods.
// Avenues/streets are inserted as gaps every BLOCK lots, giving the classic
// NYC block structure. Layout is deterministic.
export const LOT = 7; // lot spacing (building + sidewalk)
export const STREET = 5; // extra gap = a street/avenue
export const BLOCK = 4; // lots per block before a street

function gridCoord(index: number): number {
  const block = Math.floor(index / BLOCK);
  return index * LOT + block * STREET;
}

function layout(
  repos: RawRepo[],
  assign: number[],
  k: number,
): { positions: Map<string, [number, number, number]>; districts: District[] } {
  const positions = new Map<string, [number, number, number]>();

  // order repos by cluster so districts are contiguous on the grid
  const order = repos
    .map((_, i) => i)
    .sort((a, b) => assign[a] - assign[b] || a - b);

  const n = order.length;
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);

  // center the whole grid on origin
  const width = gridCoord(cols - 1);
  const depth = gridCoord(rows - 1);
  const ox = width / 2;
  const oz = depth / 2;

  order.forEach((ri, slot) => {
    const col = slot % cols;
    const row = Math.floor(slot / cols);
    const x = gridCoord(col) - ox;
    const z = gridCoord(row) - oz;
    positions.set(repos[ri].id, [x, 0, z]);
  });

  // district = centroid of its members
  const districts: District[] = [];
  for (let c = 0; c < k; c++) {
    const ids = repos.filter((_, i) => assign[i] === c).map((r) => r.id);
    if (!ids.length) continue;
    let sx = 0;
    let sz = 0;
    for (const id of ids) {
      const p = positions.get(id)!;
      sx += p[0];
      sz += p[2];
    }
    districts.push({
      id: c,
      label: "",
      color: DISTRICT_PALETTE[c % DISTRICT_PALETTE.length],
      center: [sx / ids.length, 0, sz / ids.length],
      memberIds: ids,
    });
  }
  assignLabels(repos, districts);
  return { positions, districts };
}

// ---- assembly --------------------------------------------------------------

export function assembleGraph(repos: RawRepo[]): GraphData {
  const n = repos.length;
  const vectors = repos.map((r) => r.embedding);
  const k = Math.max(2, Math.min(10, Math.round(Math.sqrt(n / 2))));
  const assign = kmeans(vectors, k);
  const { positions, districts } = layout(repos, assign, k);

  // similarity edges: top-3 neighbors per node, weight >= 0.45, dedup
  const TOP_K = 3;
  const MIN_W = 0.45;
  const edgeMap = new Map<string, SimilarityEdge>();
  for (let i = 0; i < n; i++) {
    const sims = [];
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      sims.push({ j, w: cosine(vectors[i], vectors[j]) });
    }
    sims.sort((a, b) => b.w - a.w);
    for (const { j, w } of sims.slice(0, TOP_K)) {
      if (w < MIN_W) continue;
      const a = repos[i].id;
      const b = repos[j].id;
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      const prev = edgeMap.get(key);
      if (!prev || w > prev.weight) {
        edgeMap.set(key, { source: a < b ? a : b, target: a < b ? b : a, weight: +w.toFixed(4) });
      }
    }
  }

  const maxForks = Math.max(1, ...repos.map((r) => r.forks));
  // rank-based height → evenly varied skyline, no lone giants from star outliers
  const byStars = [...repos].sort((a, b) => a.stars - b.stars);
  const rank = new Map<string, number>();
  byStars.forEach((r, i) => rank.set(r.id, repos.length > 1 ? i / (repos.length - 1) : 0.5));
  const nodes: RepoNode[] = repos.map((r) => {
    const pos = positions.get(r.id) ?? [0, 0, 0];
    const heightScale = rank.get(r.id) ?? 0.5; // 0..1 by star rank
    const forkScale = Math.log1p(r.forks) / Math.log1p(maxForks); // 0..1
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      language: r.language,
      stars: r.stars,
      forks: r.forks,
      topics: r.topics,
      url: r.url,
      avatar: r.avatar,
      readmeExcerpt: r.readmeExcerpt,
      clusterId: assign[repos.indexOf(r)],
      pos,
      // balanced skyline: floor keeps short repos real, top stays in scale
      height: +(9 + heightScale * 30).toFixed(2),
      // wider footprints so towers read as buildings, not needles (lot = 7)
      footprint: +(3.8 + forkScale * 2.4).toFixed(2),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    repos: nodes,
    edges: [...edgeMap.values()],
    districts,
  };
}

/**
 * Recompute positions, building dimensions, and district centers for an
 * existing graph (e.g. produced by an older layout) — without re-embedding or
 * re-hitting GitHub. Clusters and edges are preserved.
 */
export function relayoutGraph(graph: GraphData): GraphData {
  const proxies: RawRepo[] = graph.repos.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    language: r.language,
    stars: r.stars,
    forks: r.forks,
    topics: r.topics,
    url: r.url,
    avatar: r.avatar,
    readmeExcerpt: r.readmeExcerpt,
    embedding: [],
  }));
  const assign = graph.repos.map((r) => r.clusterId);
  const k = Math.max(0, ...assign) + 1;
  const { positions, districts } = layout(proxies, assign, k);

  const maxForks = Math.max(1, ...graph.repos.map((r) => r.forks));
  const byStars = [...graph.repos].sort((a, b) => a.stars - b.stars);
  const rank = new Map<string, number>();
  byStars.forEach((r, i) =>
    rank.set(r.id, graph.repos.length > 1 ? i / (graph.repos.length - 1) : 0.5),
  );
  const repos: RepoNode[] = graph.repos.map((r) => {
    const heightScale = rank.get(r.id) ?? 0.5;
    const forkScale = Math.log1p(r.forks) / Math.log1p(maxForks);
    return {
      ...r,
      pos: positions.get(r.id) ?? [0, 0, 0],
      height: +(9 + heightScale * 30).toFixed(2),
      footprint: +(3.8 + forkScale * 2.4).toFixed(2),
    };
  });

  return { ...graph, generatedAt: new Date().toISOString(), repos, districts };
}
