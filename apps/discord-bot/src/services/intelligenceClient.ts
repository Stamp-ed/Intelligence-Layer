import { config } from "../config.js";
import { withBackoff } from "../utils/rateLimit.js";

export interface IngestApiResult {
  document_id: string;
  job_id: string;
  chunk_count: number;
  duplicate: boolean;
  replaced?: boolean;
}

const MAX_INGEST_ATTEMPTS = 5;
const INGEST_BACKOFF_MS = 1500;

export class IngestHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "IngestHttpError";
  }
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (config.apiSecretKey) {
    headers.Authorization = `Bearer ${config.apiSecretKey}`;
  }
  return headers;
}

function isConnectionRefused(err: unknown): boolean {
  if (!(err instanceof TypeError) || err.message !== "fetch failed") {
    return false;
  }
  const cause = (err as TypeError & { cause?: unknown }).cause;
  if (cause && typeof cause === "object" && "code" in cause) {
    return (cause as { code?: string }).code === "ECONNREFUSED";
  }
  return false;
}

function isRetryableIngestError(err: unknown): boolean {
  if (isConnectionRefused(err)) return true;
  if (err instanceof IngestHttpError) {
    return err.status >= 500 || err.status === 429;
  }
  if (err instanceof TypeError && err.message === "fetch failed") {
    return true;
  }
  return false;
}

function connectionHint(): string {
  return (
    `Cannot reach Intelligence API at ${config.intelligenceApiUrl}. ` +
    "On Render: use Start Command `pnpm start:render`, unset INTELLIGENCE_API_URL (or set http://127.0.0.1:$PORT), " +
    "and confirm /health returns {\"status\":\"ok\"} without a \"user\" field."
  );
}

async function parseResponse(res: Response): Promise<IngestApiResult> {
  const body = (await res.json()) as IngestApiResult & {
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    throw new IngestHttpError(
      body.message ?? body.error ?? `Ingest failed: ${res.status}`,
      res.status,
    );
  }
  return body;
}

/** Verify the API is listening before a long backfill run. */
export async function assertApiReachable(): Promise<void> {
  const url = `${config.intelligenceApiUrl}/health`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      throw new Error(`Health check failed: HTTP ${res.status} from ${url}`);
    }
    const body = (await res.json()) as { status?: string; user?: string };
    if (body.user) {
      throw new Error(
        `${url} returned Discord bot health (user field) — API is not on this port. ${connectionHint()}`,
      );
    }
    if (body.status !== "ok") {
      throw new Error(`Unexpected health response from ${url}`);
    }
  } catch (err) {
    if (isConnectionRefused(err)) {
      throw new Error(connectionHint(), { cause: err });
    }
    throw err;
  }
}

async function ingestWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await withBackoff(fn, MAX_INGEST_ATTEMPTS, INGEST_BACKOFF_MS, isRetryableIngestError);
  } catch (err) {
    if (isConnectionRefused(err)) {
      throw new Error(connectionHint(), { cause: err });
    }
    throw err;
  }
}

export async function ingestText(payload: {
  content: string;
  title?: string;
  sourceId: string;
  author?: string;
  channel?: string;
  url?: string;
  metadata?: Record<string, unknown>;
}): Promise<IngestApiResult> {
  return ingestWithRetry(async () => {
    const res = await fetch(`${config.intelligenceApiUrl}/api/v1/ingest/text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({
        content: payload.content,
        title: payload.title,
        source_type: "discord",
        source_id: payload.sourceId,
        author: payload.author,
        channel: payload.channel,
        url: payload.url,
        metadata: payload.metadata,
      }),
    });
    return parseResponse(res);
  });
}

export async function ingestFile(payload: {
  buffer: Buffer;
  fileName: string;
  sourceId: string;
  author?: string;
  channel?: string;
  url?: string;
  metadata?: Record<string, unknown>;
}): Promise<IngestApiResult> {
  return ingestWithRetry(async () => {
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(payload.buffer)]), payload.fileName);
    form.append("source_id", payload.sourceId);
    if (payload.author) form.append("author", payload.author);
    if (payload.channel) form.append("channel", payload.channel);
    if (payload.url) form.append("url", payload.url);
    if (payload.metadata) {
      form.append("metadata", JSON.stringify(payload.metadata));
    }

    const res = await fetch(`${config.intelligenceApiUrl}/api/v1/ingest/file`, {
      method: "POST",
      headers: authHeaders(),
      body: form,
    });
    return parseResponse(res);
  });
}
