// Graph-query endpoint. Tries PuppyGraph (openCypher over Postgres) first;
// falls back to the in-process algorithms on the snapshot when PuppyGraph is
// not provisioned. Same response shape either way so the client is agnostic.
//
//   POST /api/graph  { op, id?, from?, to?, clusterId?, k? }

import { NextRequest, NextResponse } from "next/server";
import { loadGraph } from "@/lib/data";
import { cypher, puppyEnabled } from "@/lib/puppy";
import {
  neighbors,
  hubs,
  shortestPath,
  district,
  type QueryResult,
} from "@/lib/graph-queries";
import type { GraphOp } from "@/lib/types";

const ek = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

async function viaPuppy(op: GraphOp, b: any): Promise<QueryResult | null> {
  if (!puppyEnabled()) return null;
  try {
    switch (op) {
      case "neighbors": {
        const rows = await cypher(
          `MATCH (r:Repo {rid:$pId})-[e:SIMILAR_TO]-(n:Repo)
           RETURN n.rid AS nid, e.weight AS w ORDER BY w DESC LIMIT $pK`,
          { pId: b.id, pK: b.k ?? 6 },
        );
        return {
          nodeIds: [b.id, ...rows.map((r) => r.nid)],
          edgeKeys: rows.map((r) => ek(b.id, r.nid)),
        };
      }
      case "hubs": {
        const rows = await cypher(
          `MATCH (r:Repo)-[e:SIMILAR_TO]-(:Repo)
           RETURN r.rid AS id, count(e) AS deg ORDER BY deg DESC LIMIT $pTop`,
          { pTop: b.top ?? 5 },
        );
        return { nodeIds: rows.map((r) => r.id), edgeKeys: [] };
      }
      case "path": {
        const rows = await cypher(
          `MATCH p = shortestPath((a:Repo {rid:$pFrom})-[:SIMILAR_TO*..8]-(b:Repo {rid:$pTo}))
           RETURN [n IN nodes(p) | n.rid] AS ids`,
          { pFrom: b.from, pTo: b.to },
        );
        const ids: string[] = rows[0]?.ids ?? [];
        const edgeKeys: string[] = [];
        for (let i = 0; i < ids.length - 1; i++) edgeKeys.push(ek(ids[i], ids[i + 1]));
        return { nodeIds: ids, edgeKeys };
      }
      case "district": {
        const rows = await cypher(
          `MATCH (r:Repo {clusterId:$pC}) RETURN r.rid AS id`,
          { pC: b.clusterId },
        );
        return { nodeIds: rows.map((r) => r.id), edgeKeys: [] };
      }
    }
  } catch (e) {
    console.warn("PuppyGraph query failed, falling back to snapshot:", e);
    return null;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const op = body.op as GraphOp | "edges";
  if (!op) return NextResponse.json({ error: "missing op" }, { status: 400 });

  const graph = await loadGraph();

  // Full edge set — drives every rendered arc. Tries PuppyGraph first.
  if (op === "edges") {
    if (puppyEnabled()) {
      try {
        const rows = await cypher(
          `MATCH (a:Repo)-[e:SIMILAR_TO]->(b:Repo)
           RETURN a.rid AS source, b.rid AS target, e.weight AS weight`,
        );
        const edges = rows.map((r) => ({
          source: r.source,
          target: r.target,
          weight: Number(r.weight),
        }));
        return NextResponse.json({ source: "puppygraph", edges });
      } catch (e) {
        console.warn("PuppyGraph edge fetch failed, using snapshot:", e);
      }
    }
    return NextResponse.json({ source: "snapshot", edges: graph.edges });
  }

  let result = await viaPuppy(op, body);
  let source = result ? "puppygraph" : "snapshot";

  if (!result) {
    switch (op) {
      case "neighbors":
        result = neighbors(graph, body.id, body.k ?? 6);
        break;
      case "hubs":
        result = hubs(graph, body.top ?? 5);
        break;
      case "path":
        result = shortestPath(graph, body.from, body.to);
        break;
      case "district":
        result = district(graph, body.clusterId);
        break;
      default:
        return NextResponse.json({ error: "unknown op" }, { status: 400 });
    }
  }

  return NextResponse.json({ source, ...result });
}
