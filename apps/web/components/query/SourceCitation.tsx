import type { SourceCitation as SourceCitationType } from "@/lib/api";

interface SourceCitationProps {
  source: SourceCitationType;
}

export function SourceCitationCard({ source }: SourceCitationProps) {
  return (
    <article
      className="rounded border bg-orange-light p-4"
      style={{ borderColor: "rgba(247, 84, 64, 0.35)" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="h-2 w-2 rounded-full bg-stamp-orange"
          aria-hidden
        />
        <span className="text-[10px] font-bold uppercase tracking-wide text-ink">
          {source.source_type}
        </span>
        <span className="text-xs text-ink-dim ml-auto font-mono">
          {(source.relevance_score * 100).toFixed(0)}%
        </span>
      </div>
      <h4 className="font-semibold text-sm text-ink">{source.title}</h4>
      {source.channel && (
        <p className="text-xs text-ink-secondary mt-0.5">{source.channel}</p>
      )}
      <p className="text-sm text-ink-secondary mt-2 leading-relaxed">
        {source.excerpt}
      </p>
    </article>
  );
}
