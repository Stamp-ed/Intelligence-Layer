"use client";

import Link from "next/link";
import type { SigmaGraphNode, SigmaGraphPayload } from "@/lib/api";

const TYPE_LABELS: Record<SigmaGraphNode["nodeType"], string> = {
  channel: "Channel",
  document: "Document",
  entity: "Entity",
  code: "Code",
};

interface GraphNodePanelProps {
  node: SigmaGraphNode | null;
  data: SigmaGraphPayload;
}

function getNeighbors(
  nodeId: string,
  data: SigmaGraphPayload,
): Array<{ label: string; relation?: string; nodeType: SigmaGraphNode["nodeType"] }> {
  const byId = new Map(data.nodes.map((n) => [n.id, n]));
  const seen = new Set<string>();
  const out: Array<{
    label: string;
    relation?: string;
    nodeType: SigmaGraphNode["nodeType"];
  }> = [];

  for (const e of data.edges) {
    let other: string | null = null;
    if (e.source === nodeId) other = e.target;
    else if (e.target === nodeId) other = e.source;
    if (!other || seen.has(other)) continue;
    seen.add(other);
    const n = byId.get(other);
    if (n) {
      out.push({ label: n.label, relation: e.label, nodeType: n.nodeType });
    }
  }

  return out.slice(0, 12);
}

export function GraphNodePanel({ node, data }: GraphNodePanelProps) {
  if (!node) {
    return (
      <section className="card p-5 h-full min-h-[520px] flex flex-col">
        <p className="section-label">Node details</p>
        <div className="flex-1 flex items-center justify-center text-center px-4">
          <p className="text-sm text-ink-secondary leading-relaxed">
            Hover or click a node to inspect it. Small grey nodes show their name
            only while focused.
          </p>
        </div>
        {data.channels.length > 0 && (
          <div className="pt-4 border-t border-black/5">
            <p className="text-xs font-semibold text-ink-secondary mb-2">
              {data.channels.length} channels
            </p>
            <p className="text-[11px] text-ink-dim">
              Large colored nodes are channel hubs; documents orbit around them.
            </p>
          </div>
        )}
      </section>
    );
  }

  const neighbors = getNeighbors(node.id, data);
  const docCount =
    node.nodeType === "channel"
      ? data.nodes.filter(
          (n) => n.nodeType === "document" && n.channel === node.label,
        ).length
      : null;

  return (
    <section className="card p-5 h-full min-h-[520px] flex flex-col gap-4">
      <div>
        <p className="section-label mb-2">Node details</p>
        <div className="flex items-center gap-2 mb-2">
          <span
            className="h-3 w-3 shrink-0 rounded-full ring-2 ring-white shadow-sm"
            style={{ background: node.color }}
          />
          <span className="text-[10px] font-bold uppercase tracking-wide text-ink-dim">
            {TYPE_LABELS[node.nodeType]}
          </span>
        </div>
        <h2 className="text-lg font-bold text-ink leading-snug break-words">
          {node.label}
        </h2>
      </div>

      <dl className="space-y-2 text-sm">
        {node.channel && node.nodeType !== "channel" && (
          <div className="flex justify-between gap-3">
            <dt className="text-ink-dim shrink-0">Channel</dt>
            <dd className="text-ink font-medium text-right truncate">{node.channel}</dd>
          </div>
        )}
        {node.sourceType && (
          <div className="flex justify-between gap-3">
            <dt className="text-ink-dim shrink-0">Source</dt>
            <dd className="text-ink font-medium capitalize">{node.sourceType}</dd>
          </div>
        )}
        {docCount !== null && (
          <div className="flex justify-between gap-3">
            <dt className="text-ink-dim shrink-0">Documents</dt>
            <dd className="text-ink font-medium">{docCount}</dd>
          </div>
        )}
        {neighbors.length > 0 && (
          <div className="flex justify-between gap-3">
            <dt className="text-ink-dim shrink-0">Links</dt>
            <dd className="text-ink font-medium">{neighbors.length}</dd>
          </div>
        )}
      </dl>

      {node.documentId && (
        <Link
          href={`/documents/${node.documentId}`}
          className="btn-secondary text-sm text-center w-full"
        >
          Open document
        </Link>
      )}

      {neighbors.length > 0 && (
        <div className="flex-1 min-h-0">
          <p className="text-xs font-semibold text-ink-secondary mb-2">
            Connected to
          </p>
          <ul className="space-y-1.5 max-h-48 overflow-y-auto text-sm">
            {neighbors.map((n) => (
              <li
                key={`${n.label}-${n.relation}`}
                className="flex items-start gap-2 text-ink-secondary"
              >
                <span
                  className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                    n.nodeType === "entity" ? "bg-ink" : "bg-stamp-orange"
                  }`}
                />
                <span className="min-w-0">
                  <span className="text-ink font-medium">{n.label}</span>
                  {n.relation && (
                    <span className="text-ink-dim text-xs ml-1">({n.relation})</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
