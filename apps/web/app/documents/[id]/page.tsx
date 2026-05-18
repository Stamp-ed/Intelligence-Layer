"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { MarkdownContent } from "@/components/MarkdownContent";
import { deleteDocument, getDocument, type DocumentDetail } from "@/lib/api";

type ViewTab = "rendered" | "raw" | "chunks";

function isMarkdownDoc(doc: DocumentDetail): boolean {
  const t = doc.source_type;
  if (t === "markdown" || t === "discord") return true;
  const title = doc.title?.toLowerCase() ?? "";
  return title.endsWith(".md") || title.endsWith(".markdown");
}

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ViewTab>("rendered");

  useEffect(() => {
    getDocument(id)
      .then((d) => {
        setDoc(d);
        setTab(isMarkdownDoc(d) ? "rendered" : "chunks");
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load document"),
      )
      .finally(() => setLoading(false));
  }, [id]);

  const bodyContent = useMemo(() => {
    if (!doc) return "";
    if (doc.raw_content?.trim()) return doc.raw_content;
    return doc.chunks.map((c) => c.chunk_text).join("\n\n");
  }, [doc]);

  const handleDelete = async () => {
    if (!doc?.title) return;
    if (!confirm(`Delete "${doc.title}"?`)) return;
    try {
      await deleteDocument(id);
      router.push("/documents");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  };

  if (loading) {
    return <p className="text-ink-secondary">Loading…</p>;
  }

  if (error || !doc) {
    return (
      <div>
        <p className="text-stamp-orange">{error ?? "Document not found"}</p>
        <Link href="/documents" className="text-stamp-orange text-sm mt-4 inline-block">
          ← Back to documents
        </Link>
      </div>
    );
  }

  const showRendered = isMarkdownDoc(doc);

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <Link href="/documents" className="text-sm text-stamp-orange font-semibold">
          ← Documents
        </Link>
        <p className="section-label mt-4">{doc.source_type}</p>
        <h1 className="text-2xl font-bold text-ink mt-1">{doc.title ?? "Untitled"}</h1>
        <p className="text-sm text-ink-secondary mt-2">
          {doc.channel && <span>{doc.channel} · </span>}
          {doc.author && <span>{doc.author} · </span>}
          {doc.word_count ?? 0} words · {new Date(doc.ingested_at).toLocaleString()}
        </p>
        {doc.url && (
          <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-stamp-orange font-medium mt-2 inline-block"
          >
            Open source ↗
          </a>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-secondary text-sm" onClick={handleDelete}>
          Delete document
        </button>
      </div>

      {doc.summary && (
        <section
          className="p-6 rounded border-l-[3px] border-l-stamp-orange card"
        >
          <p className="section-label mb-2">Summary</p>
          <p className="text-ink leading-relaxed">{doc.summary}</p>
        </section>
      )}

      {doc.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {doc.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs font-bold uppercase px-2 py-1 rounded bg-orange-mid text-ink"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <section className="card overflow-hidden">
        <div
          className="flex flex-wrap gap-1 p-2 border-b"
          style={{ borderColor: "rgba(43,44,48,0.08)" }}
        >
          {showRendered && (
            <button
              type="button"
              onClick={() => setTab("rendered")}
              className={`px-4 py-2 text-sm font-semibold rounded-md ${
                tab === "rendered"
                  ? "bg-stamp-orange text-white"
                  : "text-ink-secondary hover:bg-raised"
              }`}
            >
              Rendered
            </button>
          )}
          <button
            type="button"
            onClick={() => setTab("raw")}
            className={`px-4 py-2 text-sm font-semibold rounded-md ${
              tab === "raw"
                ? "bg-stamp-orange text-white"
                : "text-ink-secondary hover:bg-raised"
            }`}
          >
            Raw text
          </button>
          <button
            type="button"
            onClick={() => setTab("chunks")}
            className={`px-4 py-2 text-sm font-semibold rounded-md ${
              tab === "chunks"
                ? "bg-stamp-orange text-white"
                : "text-ink-secondary hover:bg-raised"
            }`}
          >
            Chunks ({doc.chunks.length})
          </button>
        </div>

        <div className="p-6 md:p-8">
          {tab === "rendered" && showRendered && (
            <MarkdownContent content={bodyContent} />
          )}
          {tab === "raw" && (
            <pre className="text-sm whitespace-pre-wrap font-mono text-ink leading-relaxed overflow-x-auto">
              {bodyContent}
            </pre>
          )}
          {tab === "chunks" && (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              {doc.chunks.map((chunk) => (
                <article
                  key={chunk.id}
                  className="p-4 rounded border bg-content"
                  style={{ borderColor: "rgba(43,44,48,0.08)" }}
                >
                  <p className="text-[10px] font-bold uppercase text-ink-dim mb-2">
                    Chunk {chunk.chunk_index + 1}
                    {chunk.token_count != null && ` · ${chunk.token_count} tokens`}
                  </p>
                  {isMarkdownDoc(doc) ? (
                    <MarkdownContent
                      content={chunk.chunk_text}
                      className="text-sm"
                    />
                  ) : (
                    <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">
                      {chunk.chunk_text}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
