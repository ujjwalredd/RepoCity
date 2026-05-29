// Loads the graph snapshot. Imported statically so Next.js bundles it into the
// serverless function — a runtime fs read of a dynamic path is NOT traced by
// Next's output file tracing and fails with ENOENT on Vercel.

import graphJson from "@/data/graph.json";
import type { GraphData } from "./types";

const graph = graphJson as unknown as GraphData;

export async function loadGraph(): Promise<GraphData> {
  return graph;
}
