"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { deleteDocument, getDocument, type DocumentDetail } from "@/lib/api";

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDocument(id)
      .then(setDoc)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load document"),
      )
      .finally(() => setLoading(false));
  }, [id]);

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

  return (
    <div className="space-y-8">
      <div>
        <Link href="/documents" className="text-sm text-stamp-orange font-semibold">
          ← Documents
        </Link>
        <p className="section-label mt-4">{doc.source_type}</p>
        <h1 className="text-2xl font-bold text-ink mt-1">{doc.title ?? "Untitled"}</h1>
        <p className="text-sm text-ink-secondary mt-2">
          {doc.channel && <span>#{doc.channel} · </span>}
          {doc.author && <span>{doc.author} · </span>}
          {doc.word_count ?? 0} words · {new Date(doc.ingested_at).toLocaleString()}
        </p>
      </div>

      <div className="flex gap-3">
        <button type="button" className="btn-secondary text-sm" onClick={handleDelete}>
          Delete document
        </button>
      </div>

      {doc.summary && (
        <section
          className="p-6 rounded border-l-[3px] border-l-stamp-orange"
          style={{ background: "#F7F6F0" }}
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

      <section className="card p-6">
        <p className="section-label mb-4">Chunks ({doc.chunks.length})</p>
        <div className="space-y-4 max-h-[600px] overflow-y-auto">
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
              <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">
                {chunk.chunk_text}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
