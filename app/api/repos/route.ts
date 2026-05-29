// Serves the full graph snapshot for initial render.

import { NextResponse } from "next/server";
import { loadGraph } from "@/lib/data";

export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
  try {
    const graph = await loadGraph();
    return NextResponse.json(graph, {
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" },
    });
  } catch {
    return NextResponse.json(
      { error: "graph snapshot missing — run `npm run ingest` or gen-sample" },
      { status: 500 },
    );
  }
}
