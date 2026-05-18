import { config } from "../config.js";
import { withBackoff } from "../utils/rateLimit.js";

export interface IngestApiResult {
  document_id: string;
  job_id: string;
  chunk_count: number;
  duplicate: boolean;
  replaced?: boolean;
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (config.apiSecretKey) {
    headers.Authorization = `Bearer ${config.apiSecretKey}`;
  }
  return headers;
}

async function parseResponse(res: Response): Promise<IngestApiResult> {
  const body = (await res.json()) as IngestApiResult & {
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    throw new Error(body.message ?? body.error ?? `Ingest failed: ${res.status}`);
  }
  return body;
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
  return withBackoff(async () => {
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
  return withBackoff(async () => {
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
