"use client";

import Link from "next/link";
import { useState } from "react";
import type { SourceCitation as SourceCitationType } from "@/lib/api";

interface SourceCitationProps {
  source: SourceCitationType;
}

const SOURCE_COLORS: Record<string, string> = {
  discord: "#5865F2",
  markdown: "#F75440",
  pdf: "#C53B26",
  note: "#6B7280",
};

export function SourceCitationCard({ source }: SourceCitationProps) {
  const [expanded, setExpanded] = useState(false);
  const dot = SOURCE_COLORS[source.source_type] ?? "#F75440";

  return (
    <article className="rounded-full border bg-card px-3 py-2 text-sm">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 text-left"
      >
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: dot }}
          aria-hidden
        />
        <span className="font-semibold text-ink truncate flex-1">
          {source.title}
        </span>
        {source.channel && (
          <span className="text-xs text-ink-dim truncate max-w-[120px]">
            {source.channel}
          </span>
        )}
        <span className="text-xs font-mono text-ink-dim">
          {(source.relevance_score * 100).toFixed(0)}%
        </span>
      </button>

      {expanded && (
        <div className="mt-3 pl-4 border-l-2 border-l-stamp-orange space-y-2">
          <p className="text-sm text-ink-secondary leading-relaxed">{source.excerpt}</p>
          <div className="flex flex-wrap gap-3 text-xs text-ink-dim">
            {source.author && <span>{source.author}</span>}
            <span className="uppercase font-bold">{source.source_type}</span>
            <Link
              href={`/documents/${source.document_id}`}
              className="text-stamp-orange font-semibold"
            >
              View document →
            </Link>
            {source.url && (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-stamp-orange font-semibold"
              >
                Open source ↗
              </a>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
