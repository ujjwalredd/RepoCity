"use client";

import type { GraphOp, SimilarityEdge } from "./types";

interface QueryBody {
  op: GraphOp;
  id?: string;
  from?: string;
  to?: string;
  clusterId?: number;
  k?: number;
  top?: number;
}

export interface GraphQueryResponse {
  source: "puppygraph" | "snapshot";
  nodeIds: string[];
  edgeKeys: string[];
  meta?: Record<string, unknown>;
}

export async function runGraphQuery(
  body: QueryBody,
): Promise<GraphQueryResponse> {
  const res = await fetch("/api/graph", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`graph query failed: ${res.status}`);
  return res.json();
}

export interface EdgesResponse {
  source: "puppygraph" | "snapshot";
  edges: SimilarityEdge[];
}

/** Fetch the full SIMILAR_TO edge set that the city renders. */
export async function fetchEdges(): Promise<EdgesResponse> {
  const res = await fetch("/api/graph", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ op: "edges" }),
  });
  if (!res.ok) throw new Error(`edge fetch failed: ${res.status}`);
  return res.json();
}
