// Server-side PuppyGraph client. Queries openCypher over the Bolt protocol
// (PuppyGraph exposes Bolt on :7687), which maps the Postgres `repos` /
// `similarity_edges` tables to a property graph (see puppygraph/schema.json).
//
// If PUPPYGRAPH_BOLT is unset or a query fails, callers fall back to the
// in-process algorithms on the snapshot (lib/graph-queries.ts) — so the app is
// fully functional with no backend, and "production-real" when the engine runs.

import neo4j, { Driver, Integer } from "neo4j-driver";

const BOLT = process.env.PUPPYGRAPH_BOLT; // e.g. bolt://localhost:7687
const USER = process.env.PUPPYGRAPH_USER ?? "puppygraph";
const PASS = process.env.PUPPYGRAPH_PASSWORD ?? "puppygraph123";

let driver: Driver | null = null;

export function puppyEnabled() {
  return Boolean(BOLT);
}

function getDriver(): Driver {
  if (!BOLT) throw new Error("PUPPYGRAPH_BOLT not configured");
  if (!driver) {
    driver = neo4j.driver(BOLT, neo4j.auth.basic(USER, PASS), {
      // PuppyGraph is internal infra; cap connection acquisition so the API
      // route can fall back quickly if it's down
      connectionAcquisitionTimeout: 4000,
      maxConnectionPoolSize: 10,
    });
  }
  return driver;
}

// neo4j returns its own Integer type; flatten to plain JS values for JSON.
function toPlain(v: unknown): unknown {
  if (neo4j.isInt(v as never)) return (v as Integer).toNumber();
  if (Array.isArray(v)) return v.map(toPlain);
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) out[k] = toPlain(val);
    return out;
  }
  return v;
}

/**
 * Run an openCypher query against PuppyGraph and return plain row objects.
 * Integer-valued params are sent as Cypher integers (needed for LIMIT/SKIP).
 */
export async function cypher(
  query: string,
  params: Record<string, unknown> = {},
): Promise<any[]> {
  const cooked: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    cooked[k] = typeof v === "number" && Number.isInteger(v) ? neo4j.int(v) : v;
  }
  const session = getDriver().session({ defaultAccessMode: neo4j.session.READ });
  try {
    const res = await session.run(query, cooked);
    return res.records.map((r) => toPlain(r.toObject()) as Record<string, unknown>);
  } finally {
    await session.close();
  }
}
