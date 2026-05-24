import type { SyncMessageResult } from "../services/channelSyncService.js";

export const MAX_CONSECUTIVE_INGEST_FAILURES = 5;

export function isHardIngestFailure(result: SyncMessageResult): boolean {
  return result.failed > 0 && result.ingested === 0 && result.duplicates === 0;
}

export function recordIngestOutcome(
  consecutiveFailures: number,
  result: SyncMessageResult,
): { consecutiveFailures: number; shouldAbort: boolean } {
  if (isHardIngestFailure(result)) {
    const next = consecutiveFailures + 1;
    return {
      consecutiveFailures: next,
      shouldAbort: next >= MAX_CONSECUTIVE_INGEST_FAILURES,
    };
  }

  if (result.ingested > 0 || result.duplicates > 0) {
    return { consecutiveFailures: 0, shouldAbort: false };
  }

  return { consecutiveFailures, shouldAbort: false };
}

export function consecutiveFailureMessage(count: number): string {
  return (
    `Stopped after ${count} consecutive ingest failures (max ${MAX_CONSECUTIVE_INGEST_FAILURES}). ` +
    "Each message was retried up to 5 times with backoff. Check Render API logs for job error details."
  );
}
