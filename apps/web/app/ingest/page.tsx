"use client";

import { useState } from "react";
import { ingestFile, ingestText, type IngestResponse } from "@/lib/api";

export default function IngestPage() {
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IngestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await ingestText(text.trim(), title.trim() || undefined);
      setResult(res);
      if (!res.duplicate) {
        setText("");
        setTitle("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ingest failed");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await ingestFile(file);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-10">
      <div>
        <p className="section-label">Ingest</p>
        <h1 className="text-2xl font-bold text-ink mt-1">Add knowledge</h1>
      </div>

      {error && (
        <p className="text-stamp-orange text-sm" role="alert">
          {error}
        </p>
      )}

      {result && (
        <div className="card p-4 text-sm">
          {result.duplicate ? (
            <p>Duplicate detected — existing document: {result.document_id}</p>
          ) : (
            <p>
              Ingested {result.chunk_count} chunks → document{" "}
              <span className="font-mono text-xs">{result.document_id}</span>
            </p>
          )}
        </div>
      )}

      <section className="card p-6 space-y-4">
        <h2 className="font-semibold text-ink">Paste text</h2>
        <form onSubmit={handleTextSubmit} className="space-y-4">
          <input
            type="text"
            className="input-field"
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="input-field min-h-[160px]"
            placeholder="Paste content here…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
          />
          <button
            type="submit"
            className="btn-primary disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Ingesting…" : "Ingest text"}
          </button>
        </form>
      </section>

      <section className="card p-6 space-y-4">
        <h2 className="font-semibold text-ink">Upload file</h2>
        <p className="text-sm text-ink-secondary">Supported: .txt, .md</p>
        <input
          type="file"
          accept=".txt,.md,.markdown"
          onChange={handleFileChange}
          disabled={loading}
          className="text-sm"
        />
      </section>
    </div>
  );
}
