const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string }).message ?? `Request failed: ${res.status}`,
    );
  }

  return res.json() as Promise<T>;
}

export interface SourceCitation {
  document_id: string;
  chunk_id: string;
  title: string;
  source_type: string;
  channel: string | null;
  author: string | null;
  excerpt: string;
  relevance_score: number;
  url: string | null;
}

export interface QueryResponse {
  answer: string;
  sources: SourceCitation[];
  conversation_id: string;
  model_used: string;
  retrieval_metadata: {
    chunks_retrieved: number;
    top_score: number;
  };
}

export interface HealthResponse {
  status: string;
  services: {
    postgres: boolean;
    qdrant: boolean;
    openai: boolean;
  };
}

export interface StatsResponse {
  documents: number;
  chunks: number;
  entities: number;
  ingestion_jobs: number;
  queries: number;
}

export interface IngestResponse {
  document_id: string;
  job_id: string;
  chunk_count: number;
  duplicate: boolean;
}

export async function postQuery(query: string): Promise<QueryResponse> {
  return request<QueryResponse>("/api/v1/query", {
    method: "POST",
    body: JSON.stringify({ query, max_sources: 5, synthesis_level: "standard" }),
  });
}

export async function ingestText(
  content: string,
  title?: string,
): Promise<IngestResponse> {
  return request<IngestResponse>("/api/v1/ingest/text", {
    method: "POST",
    body: JSON.stringify({ content, title, source_type: "note" }),
  });
}

export async function ingestFile(file: File): Promise<IngestResponse> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API_URL}/api/v1/ingest/file`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string }).message ?? `Upload failed: ${res.status}`,
    );
  }

  return res.json() as Promise<IngestResponse>;
}

export async function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/api/v1/admin/health");
}

export async function getStats(): Promise<StatsResponse> {
  return request<StatsResponse>("/api/v1/admin/stats");
}
