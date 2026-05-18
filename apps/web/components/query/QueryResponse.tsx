import type { QueryResponse as QueryResponseType } from "@/lib/api";
import { MarkdownContent } from "@/components/MarkdownContent";
import { AnswerActions } from "./AnswerActions";
import { SourceCitationCard } from "./SourceCitation";

interface QueryResponseProps {
  response: QueryResponseType;
}

function modelBadge(model: string): string {
  if (model.includes("gpt-4o") && !model.includes("mini")) {
    return "Strategic synthesis";
  }
  return "Standard";
}

export function QueryResponse({ response }: QueryResponseProps) {
  const badge = modelBadge(response.model_used);

  return (
    <>
      <section className="space-y-6">
        <div
          className="card p-6 border-l-[3px] border-l-stamp-orange"
          style={{ background: "#F7F6F0" }}
        >
          <header className="flex items-center justify-between gap-2 mb-3">
            <p className="section-label mb-0">Answer</p>
            <span className="type-badge px-2 py-1 rounded bg-orange-mid text-ink">
              {badge}
            </span>
          </header>
          <MarkdownContent content={response.answer} />
          <AnswerActions answer={response.answer} modelUsed={response.model_used} />
          <p className="text-xs text-ink-dim mt-3 font-mono">{response.model_used}</p>
        </div>

        {response.sources.length > 0 && (
          <section>
            <p className="section-label mb-3">Sources ({response.sources.length})</p>
            <ul className="flex flex-wrap gap-2 list-none p-0 m-0">
              {response.sources.map((source) => (
                <li key={source.chunk_id}>
                  <SourceCitationCard source={source} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </section>
    </>
  );
}
