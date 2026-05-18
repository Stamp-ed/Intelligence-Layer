"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import {
  getGraphData,
  getGraphInsights,
  getGraphRebuildJob,
  getGraphStatusAll,
  postGraphRebuild,
  type GraphInsights,
  type GraphStatus,
  type GraphTarget,
  type SigmaGraphPayload,
} from "@/lib/api";

const SigmaGraphViewer = dynamic(
  () =>
    import("@/components/graph/SigmaGraphViewer").then((m) => m.SigmaGraphViewer),
  { ssr: false },
);

const TABS: { id: GraphTarget; label: string; description: string }[] = [
  {
    id: "project",
    label: "Project",
    description: "Codebase architecture — apps, packages, build spec",
  },
  {
    id: "corpus",
    label: "Uploaded knowledge",
    description: "Ingested documents — Discord, PDFs, notes",
  },
];

export default function GraphPage() {
  const [active, setActive] = useState<GraphTarget>("corpus");
  const [statuses, setStatuses] = useState<{
    project: GraphStatus;
    corpus: GraphStatus;
  } | null>(null);
  const [insights, setInsights] = useState<GraphInsights | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rebuilding, setRebuilding] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [autoRebuildStarted, setAutoRebuildStarted] = useState(false);
  const [graphData, setGraphData] = useState<SigmaGraphPayload | null>(null);

  const status = statuses?.[active] ?? null;
  const documentCount = status?.document_count ?? status?.corpus_file_count ?? 0;

  const load = useCallback(async () => {
    try {
      const all = await getGraphStatusAll();
      setStatuses(all);
      const [i, data] = await Promise.all([
        getGraphInsights(active),
        getGraphData(active).catch(() => ({
          nodes: [],
          edges: [],
          channels: [],
        })),
      ]);
      setInsights(i);
      setGraphData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load graph");
    }
  }, [active]);

  const handleRebuild = useCallback(
    async (enrichEntities?: boolean) => {
      const enrich = enrichEntities ?? active === "corpus";
      setRebuilding(true);
      setError(null);
      try {
        const { job_id } = await postGraphRebuild(active, enrich);
        setJobId(job_id);
      } catch (err) {
        setRebuilding(false);
        setError(err instanceof Error ? err.message : "Rebuild failed");
      }
    },
    [active],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (active !== "corpus" || autoRebuildStarted || rebuilding) return;
    const corpus = statuses?.corpus;
    if (!corpus) return;
    const docs = corpus.document_count ?? corpus.corpus_file_count ?? 0;
    if (docs > 0 && corpus.node_count === 0) {
      setAutoRebuildStarted(true);
      void handleRebuild(true);
    }
  }, [active, statuses, autoRebuildStarted, rebuilding, handleRebuild]);

  useEffect(() => {
    if (!jobId || !rebuilding) return;
    const interval = setInterval(async () => {
      try {
        const job = await getGraphRebuildJob(jobId);
        if (job.status === "completed" || job.status === "failed") {
          setRebuilding(false);
          setJobId(null);
          await load();
          if (job.status === "failed") {
            setError(job.error_log ?? "Graph rebuild failed");
          }
        }
      } catch {
        /* keep polling */
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [jobId, rebuilding, load]);

  const hasGraph =
    (graphData?.nodes.length ?? 0) > 0 || (status?.node_count ?? 0) > 0;
  const tab = TABS.find((t) => t.id === active) ?? TABS[0];

  return (
    <div className="space-y-6">
      <div>
        <p className="section-label">Knowledge Graph</p>
        <h1 className="text-2xl font-bold text-ink mt-1">Two views of your knowledge</h1>
        <p className="text-sm text-ink-secondary mt-2 max-w-2xl">
          <strong>Project</strong> maps how this app is built.{" "}
          <strong>Uploaded knowledge</strong> maps what you have ingested, grouped by
          Discord channel. Powered by{" "}
          <a
            href="https://www.sigmajs.org/"
            className="text-stamp-orange underline"
            target="_blank"
            rel="noreferrer"
          >
            Sigma.js
          </a>
          . Rebuild each view after changes.
        </p>
      </div>

      <div className="flex gap-2 border-b" style={{ borderColor: "rgba(43,44,48,0.10)" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActive(t.id)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              active === t.id
                ? "text-stamp-orange border-stamp-orange"
                : "text-ink-secondary border-transparent hover:text-ink"
            }`}
          >
            {t.label}
            {statuses && (
              <span className="ml-2 text-xs font-normal opacity-70">
                {statuses[t.id].node_count} nodes
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="text-sm text-ink-secondary">{tab.description}</p>
        <button
          type="button"
          className="btn-primary"
          disabled={rebuilding}
          onClick={() => void handleRebuild()}
        >
          {rebuilding
            ? "Rebuilding…"
            : `Rebuild ${tab.label.toLowerCase()} graph`}
        </button>
      </div>

      {error && (
        <p className="text-stamp-orange text-sm" role="alert">
          {error}
        </p>
      )}

      {status && (
        <section className="card p-4 grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
          <div>
            <p className="section-label">Nodes</p>
            <p className="font-bold text-ink">{status.node_count}</p>
          </div>
          <div>
            <p className="section-label">Edges</p>
            <p className="font-bold text-ink">{status.edge_count}</p>
          </div>
          <div>
            <p className="section-label">Exported files</p>
            <p className="font-bold text-ink">{status.corpus_file_count}</p>
          </div>
          {active === "corpus" && (
            <div>
              <p className="section-label">Documents</p>
              <p className="font-bold text-ink">{documentCount}</p>
            </div>
          )}
          <div>
            <p className="section-label">Status</p>
            <p className="font-bold text-ink">
              {rebuilding
                ? "Building…"
                : status.needs_rebuild
                  ? "Stale"
                  : hasGraph
                    ? "Ready"
                    : active === "corpus" && documentCount > 0
                      ? "Needs rebuild"
                      : active === "corpus"
                        ? "Ingest first"
                        : "Not built"}
            </p>
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 card overflow-hidden min-h-[480px]">
          {hasGraph && graphData && graphData.nodes.length > 0 ? (
            <SigmaGraphViewer data={graphData} height={520} />
          ) : hasGraph && active === "project" ? (
            <iframe
              title={`${tab.label} graph`}
              src={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/graph/view?target=project`}
              className="w-full h-[520px] border-0"
            />
          ) : (
            <div className="flex h-[520px] items-center justify-center p-8 text-center text-ink-secondary text-sm">
              {active === "corpus" ? (
                rebuilding ? (
                  <p>Building graph from {documentCount} documents...</p>
                ) : documentCount > 0 ? (
                  <p>
                    {documentCount} documents ready. Rebuild will start automatically,
                    or use the button above.
                  </p>
                ) : (
                  <p>No corpus graph yet. Ingest documents, then rebuild.</p>
                )
              ) : (
                <p>No project graph yet. Click Rebuild or run /graphify in Cursor.</p>
              )}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          {insights && (
            <>
              <InsightBlock title="Suggested questions" items={insights.suggested_questions} />
              <InsightBlock title="God nodes" items={insights.god_nodes} />
              <InsightBlock
                title="Surprising connections"
                items={insights.surprising_connections}
              />
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function InsightBlock({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="card p-4">
      <h2 className="font-semibold text-ink text-sm mb-2">{title}</h2>
      <ul className="space-y-2 text-sm text-ink-secondary list-disc pl-4">
        {items.slice(0, 6).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
