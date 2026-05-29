// Shared graph types — used by ingest, API routes, and the 3D client.

export interface RepoNode {
  id: string;
  name: string;
  description: string;
  language: string | null;
  stars: number;
  forks: number;
  topics: string[];
  url: string;
  avatar: string | null;
  readmeExcerpt: string;
  clusterId: number;
  /** city coordinates (y is up) */
  pos: [number, number, number];
  /** building height, world units */
  height: number;
  /** building footprint (square edge), world units */
  footprint: number;
}

export interface SimilarityEdge {
  source: string;
  target: string;
  /** cosine similarity 0..1 */
  weight: number;
}

export interface District {
  id: number;
  label: string;
  color: string;
  center: [number, number, number];
  memberIds: string[];
}

export interface GraphData {
  generatedAt: string;
  repos: RepoNode[];
  edges: SimilarityEdge[];
  districts: District[];
}

export type GraphOp = "neighbors" | "path" | "hubs" | "district";
