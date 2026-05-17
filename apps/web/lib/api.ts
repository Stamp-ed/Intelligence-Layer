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

async function requestNoContent(
  path: string,
  options: RequestInit = {},
): Promise<void> {
  const res = await fetch(`${API_URL}${path}`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string }).message ?? `Request failed: ${res.status}`,
    );
  }
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
  replaced?: boolean;
  message_count?: number;
}

export interface DocumentSummary {
  id: string;
  title: string;
  source_type: string;
  channel: string | null;
  author: string | null;
  word_count: number;
  tags: string[];
  ingested_at: string;
  summary: string;
  ingestion_status: string;
}

export interface DocumentListResponse {
  documents: DocumentSummary[];
  total: number;
  page: number;
  page_size: number;
}

export interface DocumentDetail {
  id: string;
  source_type: string;
  source_id: string | null;
  title: string | null;
  author: string | null;
  channel: string | null;
  url: string | null;
  content_hash: string | null;
  raw_content: string | null;
  summary: string | null;
  tags: string[];
  word_count: number | null;
  ingested_at: string;
  updated_at: string;
  ingestion_status: string;
  metadata: unknown;
  chunks: Array<{
    id: string;
    chunk_index: number;
    chunk_text: string;
    token_count: number | null;
    metadata: unknown;
    created_at: string;
  }>;
}

export interface IngestionJob {
  id: string;
  jobType: string;
  status: string;
  totalItems: number | null;
  processedItems: number;
  failedItems: number;
  errorLog: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  metadata: unknown;
}

export interface DocumentFilters {
  source_types: string[];
  channels: string[];
}

export interface ListDocumentsParams {
  page?: number;
  page_size?: number;
  source_type?: string;
  channel?: string;
  tag?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
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

export async function ingestDiscord(file: File): Promise<IngestResponse> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API_URL}/api/v1/ingest/discord`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string }).message ?? `Discord ingest failed: ${res.status}`,
    );
  }

  return res.json() as Promise<IngestResponse>;
}

export async function ingestBatch(folderPath: string): Promise<{
  job_id: string;
  total_files: number;
  results: Array<{
    file: string;
    status: string;
    document_id?: string;
    error?: string;
  }>;
}> {
  return request("/api/v1/ingest/batch", {
    method: "POST",
    body: JSON.stringify({ folder_path: folderPath }),
  });
}

export async function listDocuments(
  params: ListDocumentsParams = {},
): Promise<DocumentListResponse> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  });
  return request<DocumentListResponse>(`/api/v1/documents?${qs.toString()}`);
}

export async function getDocumentFilters(): Promise<DocumentFilters> {
  return request<DocumentFilters>("/api/v1/documents/filters");
}

export async function getDocument(id: string): Promise<DocumentDetail> {
  return request<DocumentDetail>(`/api/v1/documents/${id}`);
}

export async function deleteDocument(id: string): Promise<void> {
  return requestNoContent(`/api/v1/documents/${id}`, { method: "DELETE" });
}

export async function listIngestionJobs(): Promise<{ jobs: IngestionJob[] }> {
  return request<{ jobs: IngestionJob[] }>("/api/v1/ingest/jobs");
}

export async function getIngestionJob(id: string): Promise<IngestionJob> {
  return request<IngestionJob>(`/api/v1/ingest/jobs/${id}`);
}

export async function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/api/v1/admin/health");
}

export async function getStats(): Promise<StatsResponse> {
  return request<StatsResponse>("/api/v1/admin/stats");
}
