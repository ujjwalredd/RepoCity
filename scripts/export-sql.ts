// Exports data/graph.json into data/seed.sql for the Postgres + PuppyGraph
// stack. Run after ingest/gen-sample, before `docker compose up`.
//
//   npx tsx scripts/export-sql.ts

import { promises as fs } from "node:fs";
import path from "node:path";
import type { GraphData } from "../lib/types";

const esc = (s: string | null) =>
  s == null ? "NULL" : `'${s.replace(/'/g, "''")}'`;

async function main() {
  const dir = path.join(process.cwd(), "data");
  const graph: GraphData = JSON.parse(
    await fs.readFile(path.join(dir, "graph.json"), "utf8"),
  );

  const lines: string[] = [
    "DROP TABLE IF EXISTS similarity_edges;",
    "DROP TABLE IF EXISTS repos;",
    `CREATE TABLE repos (
      id TEXT PRIMARY KEY,
      name TEXT,
      description TEXT,
      language TEXT,
      stars INT,
      forks INT,
      url TEXT,
      cluster_id INT
    );`,
    `CREATE TABLE similarity_edges (
      source_id TEXT REFERENCES repos(id),
      target_id TEXT REFERENCES repos(id),
      weight DOUBLE PRECISION,
      PRIMARY KEY (source_id, target_id)
    );`,
  ];

  for (const r of graph.repos) {
    lines.push(
      `INSERT INTO repos VALUES (${esc(r.id)}, ${esc(r.name)}, ${esc(
        r.description,
      )}, ${esc(r.language)}, ${r.stars}, ${r.forks}, ${esc(r.url)}, ${r.clusterId});`,
    );
  }
  for (const e of graph.edges) {
    lines.push(
      `INSERT INTO similarity_edges VALUES (${esc(e.source)}, ${esc(
        e.target,
      )}, ${e.weight});`,
    );
  }

  await fs.writeFile(path.join(dir, "seed.sql"), lines.join("\n") + "\n");
  console.log(
    `✓ data/seed.sql — ${graph.repos.length} repos, ${graph.edges.length} edges`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
