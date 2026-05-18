const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const API_KEY = process.env.NEXT_PUBLIC_API_SECRET_KEY ?? "";

function apiHeaders(extra?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (API_KEY) {
    headers.Authorization = `Bearer ${API_KEY}`;
  }
  return { ...headers, ...(extra as Record<string, string>) };
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: apiHeaders(options.headers),
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
    graph_project?: "ok" | "missing" | "stale";
    graph_corpus?: "ok" | "missing" | "stale";
    graph?: "ok" | "missing" | "stale";
  };
}

export interface StatsResponse {
  documents: number;
  chunks: number;
  entities: number;
  relationships: number;
  graph_project_nodes?: number;
  graph_project_edges?: number;
  graph_corpus_nodes?: number;
  graph_corpus_edges?: number;
  graph_nodes?: number;
  graph_edges?: number;
  ingestion_jobs: number;
  queries: number;
}

export interface ConversationSummary {
  id: string;
  session_id: string;
  created_at: string;
  updated_at: string;
  preview: string;
}

export interface ConversationDetail {
  id: string;
  session_id: string;
  created_at: string;
  updated_at: string;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    model_used: string | null;
    created_at: string;
    sources?: SourceCitation[];
  }>;
}

export type GraphTarget = "project" | "corpus";

export interface GraphStatus {
  graph_type?: GraphTarget;
  built_at: string | null;
  node_count: number;
  edge_count: number;
  corpus_file_count: number;
  document_count?: number;
  needs_rebuild: boolean;
  source: string | null;
}

export interface GraphInsights {
  god_nodes: string[];
  surprising_connections: string[];
  suggested_questions: string[];
  report_excerpt?: string;
}

export interface SigmaGraphNode {
  id: string;
  label: string;
  size: number;
  color: string;
  x: number;
  y: number;
  nodeType: "channel" | "document" | "entity" | "code";
  channel: string | null;
  documentId?: string;
}

export interface SigmaGraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface SigmaGraphPayload {
  nodes: SigmaGraphNode[];
  edges: SigmaGraphEdge[];
  channels: string[];
}

export interface EntitySummary {
  id: string;
  name: string;
  entity_type: string;
  description: string;
  mention_count: number;
  graph_node_id: string | null;
  aliases: string[];
}

export interface EntityDetail {
  id: string;
  name: string;
  entity_type: string;
  description: string;
  mention_count: number;
  graph_node_id: string | null;
  aliases: string[];
  mentions: Array<{
    document_id: string;
    chunk_id: string;
    title: string;
    channel: string | null;
    source_type: string;
    excerpt: string;
  }>;
  related_entities: Array<{
    id: string;
    name: string;
    entity_type: string;
    relationship_type: string | null;
    direction: "incoming" | "outgoing";
  }>;
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

export interface QueryFiltersPayload {
  source_types?: string[];
  primary_channel?: string;
  channels?: string[];
  date_from?: string;
  date_to?: string;
}

export interface PostQueryOptions {
  conversationId?: string;
  synthesisLevel?: "standard" | "strategic";
  maxSources?: number;
  filters?: QueryFiltersPayload;
}

export async function postQuery(
  query: string,
  options: PostQueryOptions = {},
): Promise<QueryResponse> {
  const body: Record<string, unknown> = {
    query,
    conversation_id: options.conversationId,
    max_sources: options.maxSources ?? 5,
    synthesis_level: options.synthesisLevel ?? "standard",
  };
  if (options.filters && Object.keys(options.filters).length > 0) {
    body.filters = options.filters;
  }
  return request<QueryResponse>("/api/v1/query", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function listConversations(): Promise<{
  conversations: ConversationSummary[];
}> {
  return request("/api/v1/conversations");
}

export async function getConversation(
  id: string,
): Promise<ConversationDetail> {
  return request<ConversationDetail>(`/api/v1/conversations/${id}`);
}

export async function deleteConversation(id: string): Promise<void> {
  return requestNoContent(`/api/v1/conversations/${id}`, { method: "DELETE" });
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

  const headers: Record<string, string> = {};
  if (API_KEY) headers.Authorization = `Bearer ${API_KEY}`;
  const res = await fetch(`${API_URL}/api/v1/ingest/file`, {
    method: "POST",
    headers,
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

  const headers: Record<string, string> = {};
  if (API_KEY) headers.Authorization = `Bearer ${API_KEY}`;
  const res = await fetch(`${API_URL}/api/v1/ingest/discord`, {
    method: "POST",
    headers,
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

export async function getGraphStatus(
  target: GraphTarget = "corpus",
): Promise<GraphStatus> {
  return request<GraphStatus>(`/api/v1/graph/status?target=${target}`);
}

export async function getGraphStatusAll(): Promise<{
  project: GraphStatus;
  corpus: GraphStatus;
}> {
  return request("/api/v1/graph/status?all=true");
}

export async function getGraphInsights(
  target: GraphTarget = "corpus",
): Promise<GraphInsights> {
  return request<GraphInsights>(`/api/v1/graph/insights?target=${target}`);
}

export async function getGraphData(
  target: GraphTarget = "corpus",
): Promise<SigmaGraphPayload> {
  return request<SigmaGraphPayload>(`/api/v1/graph/data?target=${target}`);
}

export async function postGraphRebuild(
  target: GraphTarget = "corpus",
  enrichEntities = false,
): Promise<{ job_id: string; status: string; target: GraphTarget }> {
  return request("/api/v1/graph/rebuild", {
    method: "POST",
    body: JSON.stringify({
      target,
      enrich_entities: enrichEntities,
    }),
  });
}

export async function getGraphRebuildJob(jobId: string): Promise<{
  id: string;
  status: string;
  error_log: string | null;
  metadata: unknown;
  completed_at: string | null;
}> {
  return request(`/api/v1/graph/rebuild/${jobId}`);
}

export async function listEntities(params: {
  page?: number;
  page_size?: number;
  entity_type?: string;
  search?: string;
}): Promise<{ entities: EntitySummary[]; total: number; page: number; page_size: number }> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  });
  return request(`/api/v1/entities?${qs.toString()}`);
}

export async function getEntity(id: string): Promise<EntityDetail> {
  return request<EntityDetail>(`/api/v1/entities/${id}`);
}
