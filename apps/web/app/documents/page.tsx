"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  deleteDocument,
  getDocumentFilters,
  listDocuments,
  type DocumentSummary,
} from "@/lib/api";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [channel, setChannel] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("ingested_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [sourceTypes, setSourceTypes] = useState<string[]>([]);
  const [channels, setChannels] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listDocuments({
        page,
        page_size: 50,
        search: search || undefined,
        source_type: sourceType || undefined,
        channel: channel || undefined,
        date_from: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        date_to: dateTo ? new Date(dateTo).toISOString() : undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      setDocuments(res.documents);
      setTotal(res.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [page, search, sourceType, channel, dateFrom, dateTo, sortBy, sortOrder]);

  useEffect(() => {
    getDocumentFilters()
      .then((f) => {
        setSourceTypes(f.source_types);
        setChannels(f.channels);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This removes all chunks and vectors.`)) return;
    try {
      await deleteDocument(id);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / 50));

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <aside className="lg:w-64 shrink-0 space-y-4">
        <div>
          <p className="section-label">Documents</p>
          <h1 className="text-2xl font-bold text-ink mt-1">Knowledge base</h1>
        </div>

        <div className="card p-4 space-y-3">
          <label className="block text-xs font-semibold text-ink-secondary uppercase">
            Search
          </label>
          <input
            className="input-field text-sm"
            placeholder="Title or content…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />

          <label className="block text-xs font-semibold text-ink-secondary uppercase pt-2">
            Source type
          </label>
          <select
            className="input-field text-sm"
            value={sourceType}
            onChange={(e) => {
              setSourceType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All</option>
            {sourceTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <label className="block text-xs font-semibold text-ink-secondary uppercase pt-2">
            Channel
          </label>
          <select
            className="input-field text-sm"
            value={channel}
            onChange={(e) => {
              setChannel(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All</option>
            {channels.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <label className="block text-xs font-semibold text-ink-secondary uppercase pt-2">
            From
          </label>
          <input
            type="date"
            className="input-field text-sm"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
          />

          <label className="block text-xs font-semibold text-ink-secondary uppercase pt-2">
            To
          </label>
          <input
            type="date"
            className="input-field text-sm"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        {error && (
          <p className="text-stamp-orange text-sm mb-4" role="alert">
            {error}
          </p>
        )}

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-high-raised">
                  {(
                    [
                      ["title", "Title"],
                      ["source_type", "Source"],
                      ["channel", "Channel"],
                      ["word_count", "Words"],
                      ["ingested_at", "Ingested"],
                    ] as const
                  ).map(([key, label]) => (
                    <th
                      key={key}
                      className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-ink-secondary cursor-pointer hover:text-stamp-orange"
                      onClick={() => {
                        if (sortBy === key) {
                          setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        } else {
                          setSortBy(key);
                          setSortOrder("desc");
                        }
                      }}
                    >
                      {label}
                      {sortBy === key && (sortOrder === "asc" ? " ↑" : " ↓")}
                    </th>
                  ))}
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-ink-secondary">
                      Loading…
                    </td>
                  </tr>
                ) : documents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-ink-secondary">
                      No documents found
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => (
                    <tr
                      key={doc.id}
                      className="border-b hover:bg-orange-light/50"
                      style={{ borderColor: "rgba(43,44,48,0.08)" }}
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/documents/${doc.id}`}
                          className="font-semibold text-ink hover:text-stamp-orange"
                        >
                          {doc.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-ink-secondary">{doc.source_type}</td>
                      <td className="px-4 py-3 text-ink-secondary">{doc.channel ?? "—"}</td>
                      <td className="px-4 py-3 text-ink-secondary">{doc.word_count}</td>
                      <td className="px-4 py-3 text-ink-secondary text-xs">
                        {new Date(doc.ingested_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          className="text-xs text-stamp-orange font-semibold hover:underline"
                          onClick={() => handleDelete(doc.id, doc.title)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div
            className="flex items-center justify-between px-4 py-3 border-t text-sm"
            style={{ borderColor: "rgba(43,44,48,0.08)" }}
          >
            <span className="text-ink-secondary">{total} documents</span>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary text-xs py-1 px-2"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span className="text-ink-secondary self-center text-xs">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="btn-secondary text-xs py-1 px-2"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
