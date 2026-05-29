// Server-side PuppyGraph client. Talks openCypher over PuppyGraph's HTTP
// query endpoint. If PUPPYGRAPH_URL is unset or the call fails, callers fall
// back to lib/graph-queries.ts running on the snapshot. This keeps the app
// fully functional offline while remaining production-ready when the engine
// is provisioned.

const URL_BASE = process.env.PUPPYGRAPH_URL;
const USER = process.env.PUPPYGRAPH_USER ?? "puppygraph";
const PASS = process.env.PUPPYGRAPH_PASSWORD ?? "puppygraph123";

export function puppyEnabled() {
  return Boolean(URL_BASE);
}

/**
 * Run an openCypher query against PuppyGraph. Returns the raw rows.
 * Schema mapping lives in puppygraph/schema.json (Repo vertices, SIMILAR_TO edges).
 */
export async function cypher(
  query: string,
  params: Record<string, unknown> = {},
): Promise<any[]> {
  if (!URL_BASE) throw new Error("PUPPYGRAPH_URL not configured");
  const auth = Buffer.from(`${USER}:${PASS}`).toString("base64");
  const res = await fetch(`${URL_BASE}/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({ query, parameters: params }),
    // PuppyGraph is internal infra; short timeout so the API route can fall back
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) throw new Error(`PuppyGraph ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.results ?? data.data ?? [];
}
