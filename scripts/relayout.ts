// Re-applies the current city layout to an existing data/graph.json without
// re-embedding or re-fetching GitHub. Use after changing layout/height code.
//
//   npx tsx scripts/relayout.ts

import { promises as fs } from "node:fs";
import path from "node:path";
import type { GraphData } from "../lib/types";
import { relayoutGraph } from "./build-graph.js";

async function main() {
  const file = path.join(process.cwd(), "data", "graph.json");
  const graph: GraphData = JSON.parse(await fs.readFile(file, "utf8"));
  const next = relayoutGraph(graph);
  await fs.writeFile(file, JSON.stringify(next, null, 2));
  console.log(
    `✓ relaid out ${next.repos.length} repos, ${next.districts.length} districts (edges preserved: ${next.edges.length})`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
