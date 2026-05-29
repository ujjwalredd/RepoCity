// One-time ingest: fetch repos from GitHub, embed with a local model
// (@xenova/transformers, no API key), assemble the graph, write data/graph.json.
//
//   npm run ingest
//
// Env (see .env.example): GITHUB_USER or GITHUB_ORG, optional GITHUB_TOKEN.

import { promises as fs } from "node:fs";
import path from "node:path";
import { pipeline } from "@xenova/transformers";
import { assembleGraph, type RawRepo } from "./build-graph.js";

const USER = process.env.GITHUB_USER;
const ORG = process.env.GITHUB_ORG;
const TOKEN = process.env.GITHUB_TOKEN;

const gh = async (url: string) => {
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`GitHub ${res.status} on ${url}: ${await res.text()}`);
  return res.json();
};

async function fetchRepos(): Promise<any[]> {
  if (!USER && !ORG) throw new Error("Set GITHUB_USER or GITHUB_ORG in .env");
  const base = ORG
    ? `https://api.github.com/orgs/${ORG}/repos`
    : `https://api.github.com/users/${USER}/repos`;
  const all: any[] = [];
  for (let page = 1; page <= 5; page++) {
    const batch = await gh(`${base}?per_page=100&page=${page}&sort=updated`);
    if (!batch.length) break;
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all.filter((r) => !r.fork && !r.archived);
}

async function fetchReadme(fullName: string): Promise<string> {
  try {
    const r = await gh(`https://api.github.com/repos/${fullName}/readme`);
    const text = Buffer.from(r.content, "base64").toString("utf8");
    return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
}

function embedText(r: any, readme: string): string {
  return [
    r.name,
    r.description ?? "",
    (r.topics ?? []).join(" "),
    r.language ?? "",
    readme.slice(0, 1200),
  ].join(". ");
}

async function main() {
  console.log("→ Fetching repos…");
  const raw = await fetchRepos();
  console.log(`  ${raw.length} repos`);

  console.log("→ Loading embedding model (first run downloads ~90MB)…");
  const extractor = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2",
  );

  const repos: RawRepo[] = [];
  for (const r of raw) {
    const readme = await fetchReadme(r.full_name);
    const text = embedText(r, readme);
    const out: any = await extractor(text, { pooling: "mean", normalize: true });
    const embedding = Array.from(out.data as Float32Array);
    repos.push({
      id: String(r.id),
      name: r.name,
      description: r.description ?? "",
      language: r.language,
      stars: r.stargazers_count ?? 0,
      forks: r.forks_count ?? 0,
      topics: r.topics ?? [],
      url: r.html_url,
      avatar: r.owner?.avatar_url ?? null,
      readmeExcerpt: readme.slice(0, 600),
      embedding,
    });
    process.stdout.write(`  embedded ${repos.length}/${raw.length}\r`);
  }
  console.log("");

  const graph = assembleGraph(repos);
  const outDir = path.join(process.cwd(), "data");
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(
    path.join(outDir, "graph.json"),
    JSON.stringify(graph, null, 2),
  );
  console.log(
    `✓ Wrote data/graph.json — ${graph.repos.length} repos, ${graph.edges.length} edges, ${graph.districts.length} districts`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
