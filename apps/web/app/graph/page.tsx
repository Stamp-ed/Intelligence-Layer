"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import {
  getGraphData,
  getGraphRebuildJob,
  getGraphStatus,
  postGraphRebuild,
  type GraphStatus,
  type SigmaGraphNode,
  type SigmaGraphPayload,
} from "@/lib/api";
import { GraphNodePanel } from "@/components/graph/GraphNodePanel";

const SigmaGraphViewer = dynamic(
  () =>
    import("@/components/graph/SigmaGraphViewer").then((m) => m.SigmaGraphViewer),
  { ssr: false },
);

export default function GraphPage() {
  const [status, setStatus] = useState<GraphStatus | null>(null);
  const [focusedNode, setFocusedNode] = useState<SigmaGraphNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<SigmaGraphPayload | null>(null);

  const documentCount =
    status?.document_count ?? status?.corpus_file_count ?? 0;
  const nodeCount =
    status?.node_count ?? graphData?.nodes.length ?? 0;
  const edgeCount =
    status?.edge_count ?? graphData?.edges.length ?? 0;

  const load = useCallback(async () => {
    try {
      const [nextStatus, graphPayload] = await Promise.all([
        getGraphStatus(),
        getGraphData().catch(() => ({
          nodes: [],
          edges: [],
          channels: [],
        })),
      ]);
      setStatus(nextStatus);
      setGraphData(graphPayload);
      setFocusedNode(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load graph");
    }
  }, []);

  const handleEnrich = useCallback(async () => {
    setEnriching(true);
    setError(null);
    try {
      const { job_id } = await postGraphRebuild();
      setJobId(job_id);
    } catch (err) {
      setEnriching(false);
      setError(err instanceof Error ? err.message : "Enrichment failed");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!jobId || !enriching) return;
    const interval = setInterval(async () => {
      try {
        const job = await getGraphRebuildJob(jobId);
        if (job.status === "completed" || job.status === "failed") {
          setEnriching(false);
          setJobId(null);
          await load();
          if (job.status === "failed") {
            setError(job.error_log ?? "Entity enrichment failed");
          }
        }
      } catch {
        /* keep polling */
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [jobId, enriching, load]);

  const hasGraph = (graphData?.nodes.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="section-label">Knowledge map</p>
        <h1 className="text-[1.75rem] font-medium text-ink mt-1">
          How your ingested knowledge connects
        </h1>
        <p className="text-sm text-ink-secondary mt-2 max-w-2xl">
          Live view of documents, Discord channels, and extracted entities from your
          corpus. Powered by{" "}
          <a
            href="https://www.sigmajs.org/"
            className="text-stamp-orange underline"
            target="_blank"
            rel="noreferrer"
          >
            Sigma.js
          </a>
          . Run entity enrichment after bulk ingest to populate more nodes.
        </p>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="text-sm text-ink-secondary">
          {documentCount} document{documentCount === 1 ? "" : "s"} in corpus
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-secondary"
            disabled={enriching}
            onClick={() => void load()}
          >
            Refresh
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={enriching || documentCount === 0}
            onClick={() => void handleEnrich()}
          >
            {enriching ? "Enriching…" : "Enrich entities"}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-stamp-orange text-sm" role="alert">
          {error}
        </p>
      )}

      {(status || graphData) && (
        <section className="card p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="section-label">Nodes</p>
            <p className="stat-value">{nodeCount}</p>
          </div>
          <div>
            <p className="section-label">Edges</p>
            <p className="stat-value">{edgeCount}</p>
          </div>
          <div>
            <p className="section-label">Documents</p>
            <p className="stat-value">{documentCount}</p>
          </div>
          <div>
            <p className="section-label">Source</p>
            <p className="stat-value capitalize">{status?.source ?? "postgres"}</p>
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 card overflow-hidden min-h-[480px] p-0">
          {hasGraph && graphData ? (
            <SigmaGraphViewer
              data={graphData}
              height={520}
              onNodeFocus={setFocusedNode}
            />
          ) : (
            <div className="flex h-[520px] items-center justify-center p-8 text-center text-ink-secondary text-sm">
              {documentCount > 0 ? (
                <p>
                  {documentCount} documents ingested. Use &quot;Enrich entities&quot; to
                  extract entities and relationships, then refresh.
                </p>
              ) : (
                <p>No documents yet. Ingest content first, then return here.</p>
              )}
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-4 self-start">
          {graphData && (
            <GraphNodePanel node={focusedNode} data={graphData} />
          )}
        </aside>
      </div>
    </div>
  );
}
