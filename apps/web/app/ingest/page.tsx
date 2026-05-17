"use client";

import { useState } from "react";
import {
  ingestBatch,
  ingestDiscord,
  ingestFile,
  ingestText,
  type IngestResponse,
} from "@/lib/api";
import { FileUploader } from "@/components/ingest/FileUploader";
import { JobTracker } from "@/components/ingest/JobTracker";

type Tab = "text" | "file" | "discord" | "batch";

function ResultBanner({ result }: { result: IngestResponse }) {
  return (
    <div className="card p-4 text-sm">
      {result.duplicate ? (
        <p>Duplicate detected — existing document: {result.document_id}</p>
      ) : result.replaced ? (
        <p>
          Updated source (replaced prior version) — {result.chunk_count} chunks,{" "}
          <span className="font-mono text-xs">{result.document_id}</span>
        </p>
      ) : (
        <p>
          Ingested {result.chunk_count} chunks
          {result.message_count != null && ` from ${result.message_count} messages`} →{" "}
          <span className="font-mono text-xs">{result.document_id}</span>
        </p>
      )}
    </div>
  );
}

export default function IngestPage() {
  const [tab, setTab] = useState<Tab>("text");
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [batchPath, setBatchPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IngestResponse | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tabs: { id: Tab; label: string }[] = [
    { id: "text", label: "Paste text" },
    { id: "file", label: "Upload file" },
    { id: "discord", label: "Discord export" },
    { id: "batch", label: "Batch folder" },
  ];

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await ingestText(text.trim(), title.trim() || undefined);
      setResult(res);
      if (res.job_id) setActiveJobId(res.job_id);
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

  const handleFile = async (file: File) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await ingestFile(file);
      setResult(res);
      if (res.job_id) setActiveJobId(res.job_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDiscord = async (file: File) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await ingestDiscord(file);
      setResult(res);
      if (res.job_id) setActiveJobId(res.job_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Discord ingest failed");
    } finally {
      setLoading(false);
    }
  };

  const handleBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchPath.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await ingestBatch(batchPath.trim());
      setActiveJobId(res.job_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Batch ingest failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="section-label">Ingest</p>
        <h1 className="text-2xl font-bold text-ink mt-1">Add knowledge</h1>
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-2" style={{ borderColor: "rgba(43,44,48,0.10)" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 text-sm font-semibold rounded ${
              tab === t.id
                ? "text-stamp-orange border-b-2 border-stamp-orange"
                : "text-ink-secondary hover:text-stamp-orange"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-stamp-orange text-sm" role="alert">
          {error}
        </p>
      )}

      {result && <ResultBanner result={result} />}

      {tab === "text" && (
        <section className="card p-6 space-y-4">
          <form onSubmit={handleTextSubmit} className="space-y-4">
            <input
              type="text"
              className="input-field"
              placeholder="Title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="input-field min-h-[200px]"
              placeholder="Paste content here…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary disabled:opacity-50" disabled={loading}>
              {loading ? "Ingesting…" : "Ingest text"}
            </button>
          </form>
        </section>
      )}

      {tab === "file" && (
        <section className="card p-6">
          <FileUploader
            accept=".txt,.md,.markdown,.pdf"
            label="Upload document"
            hint="Supported: .txt, .md, .pdf"
            disabled={loading}
            onFile={handleFile}
          />
        </section>
      )}

      {tab === "discord" && (
        <section className="card p-6">
          <FileUploader
            accept=".json"
            label="Discord Chat Exporter JSON"
            hint="Export from Discord using Chat Exporter, then upload the JSON file"
            disabled={loading}
            onFile={handleDiscord}
          />
        </section>
      )}

      {tab === "batch" && (
        <section className="card p-6 space-y-4">
          <p className="text-sm text-ink-secondary">
            Scan a folder on the API server for .txt, .md, and .pdf files. Set{" "}
            <code className="font-mono text-xs">INGEST_BATCH_ROOTS</code> in the API env to
            restrict allowed paths.
          </p>
          <form onSubmit={handleBatch} className="space-y-4">
            <input
              type="text"
              className="input-field font-mono text-sm"
              placeholder="D:\Startups\Stamped\docs"
              value={batchPath}
              onChange={(e) => setBatchPath(e.target.value)}
            />
            <button type="submit" className="btn-primary disabled:opacity-50" disabled={loading}>
              {loading ? "Scanning…" : "Start batch ingest"}
            </button>
          </form>
        </section>
      )}

      <section className="card p-6 space-y-4">
        <h2 className="font-semibold text-ink">Ingestion jobs</h2>
        <JobTracker activeJobId={activeJobId} />
      </section>
    </div>
  );
}
