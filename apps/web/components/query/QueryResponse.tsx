import type { QueryResponse as QueryResponseType } from "@/lib/api";
import { SourceCitationCard } from "./SourceCitation";

interface QueryResponseProps {
  response: QueryResponseType;
}

export function QueryResponse({ response }: QueryResponseProps) {
  return (
    <div className="space-y-6">
      <div
        className="card p-6 border-l-[3px] border-l-stamp-orange"
        style={{ background: "#F7F6F0" }}
      >
        <p className="section-label mb-2">Answer</p>
        <div className="prose prose-sm max-w-none text-ink whitespace-pre-wrap">
          {response.answer}
        </div>
        <p className="text-xs text-ink-dim mt-4 font-mono">
          Model: {response.model_used}
        </p>
      </div>

      {response.sources.length > 0 && (
        <div>
          <p className="section-label mb-3">Sources</p>
          <div className="space-y-3">
            {response.sources.map((source) => (
              <SourceCitationCard key={source.chunk_id} source={source} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
