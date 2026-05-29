# RepoCity — 3D Repository Visualization

Explore your GitHub repos as a **3D city**. Each repo is a building, semantic-similarity
clusters form **districts**, and glowing arcs are **similarity links**. Graph traversals
(neighbors / shortest path / hubs) are powered by **PuppyGraph** over Postgres, with an
in-process fallback so the app works with zero backend.

```
GitHub API ──ingest──> data/graph.json ──> Next.js API ──> react-three-fiber city
                            │
                            └─export-sql─> Postgres ──> PuppyGraph (Cypher/Gremlin)
```

## Stack
- **Next.js 14** (App Router) on Vercel
- **react-three-fiber** + **drei** + **@react-three/postprocessing** (Bloom, vignette, SMAA)
- **GSAP** camera fly-to + panel transitions
- **zustand** state
- **@xenova/transformers** local embeddings (all-MiniLM-L6-v2 — no API key)
- **PuppyGraph** + **Postgres** graph backend (Docker)

## Quick start (renders immediately, no backend)
```bash
npm install
npm run sample        # writes sample data/graph.json (refuses to clobber real data; use -- --force)
npm run dev           # http://localhost:3000
```

## Use your real repos
```bash
cp .env.example .env            # set GITHUB_USER (or GITHUB_ORG) + optional GITHUB_TOKEN
npm run ingest                  # fetch + embed + cluster + layout -> data/graph.json
npm run dev
```
First ingest downloads the embedding model (~90 MB) once.
After changing layout/height code, re-apply it without re-embedding: `npm run relayout`.

## Enable PuppyGraph (real graph engine)
```bash
npm run export-sql              # data/graph.json -> data/seed.sql (loaded by Postgres on first boot)
docker compose up -d            # Postgres + PuppyGraph (Bolt :7687, UI :8081)

# register the schema (maps the SQL tables to a Repo/SIMILAR_TO graph):
curl -XPOST -H "content-type: application/json" --data @puppygraph/schema.json \
  --user "puppygraph:puppygraph123" http://localhost:8081/schema

cp .env.example .env            # already sets PUPPYGRAPH_BOLT=bolt://localhost:7687
npm run dev
```
With `PUPPYGRAPH_BOLT` set, `/api/graph` runs **openCypher over Bolt** against PuppyGraph
(`lib/puppy.ts`); otherwise it falls back to `lib/graph-queries.ts` on the snapshot. The toolbar
shows which served each query (`via puppygraph` / `via snapshot`). Neighbors, shortest-path,
hubs, district, and the rendered edge set are all real Cypher traversals.

## Controls
- **Drag** orbit · **scroll** zoom · **click** building → side panel · click empty space → deselect
- **← / →** cycle repos · **Esc** clear selection
- Toolbar: search, language filter, **Neighbors**, **Path** (pick A, then B), **Top hubs**, **Table** view, **Reset**
- District chips (in-scene + legend) filter the city

## Deploy
- **Frontend → Vercel.** Zero config: import the repo, Vercel detects Next.js. `data/graph.json`
  is committed and bundled (imported statically — no runtime filesystem reads), so the app
  works with **no env vars**.
- **PuppyGraph + Postgres → a container host** (Railway / Fly / VM) — *not* Vercel (stateful).
  Set `PUPPYGRAPH_BOLT`, `PUPPYGRAPH_USER`, `PUPPYGRAPH_PASSWORD` as Vercel env vars to enable
  live graph queries; without them the app falls back to in-process algorithms on the snapshot.

## Security notes
- **No secrets in the repo.** Only `.env.example` (template) is committed; `.env*` is gitignored.
  `GITHUB_TOKEN` and `PUPPYGRAPH_*` are read from the environment at run/build time only.
- The Postgres/PuppyGraph credentials in `docker-compose.yml` are **local-dev defaults** — change
  them for any non-local deployment.
- `npm audit` reports two advisories pulled in by `next`'s own dependencies: a build-time PostCSS
  issue and a self-hosted Image-Optimizer/RSC **DoS** class. Neither is reachable in this app on
  Vercel (Vercel runs its own optimizer/edge; the build runs on controlled input). The `--force`
  fix is a Next 16 major bump and is intentionally not applied. All critical/auth-bypass Next CVEs
  are patched in the pinned `14.2.35`.
- `@xenova/transformers` (which transitively flags a protobufjs advisory) is a **devDependency used
  only by `scripts/ingest.ts`** — it is never part of the deployed bundle.

## Layout
```
app/            layout, page, api/repos, api/graph
components/scene  Scene, City, Building, Arc (shader), Ground, CameraRig, Effects, DistrictLabels
components/ui     Toolbar, SidePanel, Legend, Loader, DataTable
lib/            types, store (zustand), graph-queries, puppy client, data loader
scripts/        ingest, gen-sample, build-graph (shared), export-sql
puppygraph/     schema.json (SQL → graph mapping)
```

Accessibility: keyboard nav, focus rings, `prefers-reduced-motion` (kills arc flow / auto-rotate /
camera tweens), color-plus-label districts, and a full **table view** as a text equivalent of the canvas.
