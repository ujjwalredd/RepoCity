// Generates a deterministic sample data/graph.json so the app renders before
// running the real GitHub ingest. Synthetic repos grouped into themes; each
// theme gets a clustered fake embedding so districts + edges look realistic.
//
//   npx tsx scripts/gen-sample.ts

import { promises as fs } from "node:fs";
import path from "node:path";
import { assembleGraph, type RawRepo } from "./build-graph.js";

const THEMES: Record<string, { langs: string[]; topics: string[]; names: string[] }> = {
  "web-frontend": {
    langs: ["TypeScript", "JavaScript"],
    topics: ["react", "nextjs", "ui", "frontend"],
    names: ["dash-ui", "portfolio-site", "design-system", "landing-kit", "marketing-web", "blog-engine"],
  },
  "ml-ai": {
    langs: ["Python", "Jupyter Notebook"],
    topics: ["machine-learning", "pytorch", "nlp", "transformers"],
    names: ["text-classifier", "vision-net", "llm-finetune", "embeddings-lab", "rl-agent", "data-pipeline"],
  },
  "backend-api": {
    langs: ["Go", "Rust", "TypeScript"],
    topics: ["api", "microservices", "grpc", "backend"],
    names: ["auth-service", "gateway", "billing-api", "notify-svc", "search-api", "graph-engine"],
  },
  "devops-infra": {
    langs: ["Go", "Shell", "HCL"],
    topics: ["kubernetes", "terraform", "ci", "docker"],
    names: ["k8s-operator", "deploy-bot", "infra-modules", "log-shipper", "metrics-agent"],
  },
  "data-viz": {
    langs: ["TypeScript", "Python"],
    topics: ["d3", "three", "visualization", "graph"],
    names: ["chart-lib", "3d-globe", "graph-viz", "dashboard-x", "map-render"],
  },
  "tooling-cli": {
    langs: ["Rust", "Go", "TypeScript"],
    topics: ["cli", "developer-tools", "automation"],
    names: ["scaffold-cli", "lint-rules", "release-tool", "dotfiles", "bench-suite", "codegen"],
  },
};

const DIM = 64;

function prng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
const rand = prng(20260528);

function themeVector(themeIdx: number, total: number): number[] {
  // base vector per theme, plus small noise → tight clusters
  const base = new Array(DIM).fill(0).map((_, d) =>
    Math.sin((themeIdx + 1) * (d + 1) * 0.37),
  );
  return base.map((v) => v + (rand() - 0.5) * 0.6);
}

async function main() {
  const repos: RawRepo[] = [];
  let id = 1;
  const themeKeys = Object.keys(THEMES);
  themeKeys.forEach((theme, ti) => {
    const cfg = THEMES[theme];
    cfg.names.forEach((name, ni) => {
      const stars = Math.floor(rand() ** 2 * 4000);
      const forks = Math.floor(stars * (0.05 + rand() * 0.2));
      repos.push({
        id: String(id++),
        name,
        description: `A ${theme.replace("-", " ")} project: ${name}.`,
        language: cfg.langs[ni % cfg.langs.length],
        stars,
        forks,
        topics: cfg.topics.slice(0, 2 + (ni % 2)),
        url: `https://github.com/sample/${name}`,
        avatar: null,
        readmeExcerpt: `${name} — part of the ${theme} stack. ${cfg.topics.join(", ")}.`,
        embedding: themeVector(ti, themeKeys.length),
      });
    });
  });

  const graph = assembleGraph(repos);
  const outDir = path.join(process.cwd(), "data");
  await fs.mkdir(outDir, { recursive: true });
  const out = path.join(outDir, "graph.json");

  // never silently clobber real ingested data — require --force
  const exists = await fs.access(out).then(() => true).catch(() => false);
  if (exists && !process.argv.includes("--force")) {
    console.error(
      "✗ data/graph.json already exists. Refusing to overwrite.\n" +
        "  Re-run with --force to replace it with sample data.",
    );
    process.exit(1);
  }
  await fs.writeFile(out, JSON.stringify(graph, null, 2));
  console.log(
    `✓ sample data/graph.json — ${graph.repos.length} repos, ${graph.edges.length} edges, ${graph.districts.length} districts`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
