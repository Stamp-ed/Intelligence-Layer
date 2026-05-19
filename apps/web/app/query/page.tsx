"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deleteConversation,
  getConversation,
  getDocumentFilters,
  listConversations,
  postQuery,
  type ConversationSummary,
  type QueryResponse,
} from "@/lib/api";
import { QueryInput } from "@/components/query/QueryInput";
import { QueryResponse as QueryResponseView } from "@/components/query/QueryResponse";
import {
  QueryFilters,
  type QueryFilterState,
} from "@/components/query/QueryFilters";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface ThreadMessage {
  role: "user" | "assistant";
  content: string;
  model_used?: string;
  sources?: QueryResponse["sources"];
}

const STORAGE_KEY = "stamped_conversation_id";

const emptyFilters: QueryFilterState = {
  primaryChannel: "",
  sourceTypes: [],
  channels: [],
  dateFrom: "",
  dateTo: "",
};

function toApiFilters(filters: QueryFilterState) {
  const payload: {
    source_types?: string[];
    primary_channel?: string;
    channels?: string[];
    date_from?: string;
    date_to?: string;
  } = {};
  if (filters.sourceTypes.length) payload.source_types = filters.sourceTypes;
  if (filters.primaryChannel.trim()) {
    payload.primary_channel = filters.primaryChannel.trim();
  }
  if (filters.channels.length) payload.channels = filters.channels;
  if (filters.dateFrom) {
    payload.date_from = new Date(filters.dateFrom).toISOString();
  }
  if (filters.dateTo) {
    const d = new Date(filters.dateTo);
    d.setHours(23, 59, 59, 999);
    payload.date_to = d.toISOString();
  }
  return payload;
}

export default function QueryPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [strategic, setStrategic] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [filters, setFilters] = useState<QueryFilterState>(emptyFilters);
  const [sourceTypes, setSourceTypes] = useState<string[]>([]);
  const [channels, setChannels] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    preview: string;
  } | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      const { conversations: list } = await listConversations();
      setConversations(list);
    } catch {
      /* optional */
    }
  }, []);

  useEffect(() => {
    getDocumentFilters()
      .then((f) => {
        setSourceTypes(f.source_types);
        setChannels(f.channels);
      })
      .catch(() => {});

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setConversationId(saved);
      getConversation(saved)
        .then((c) => {
          setThread(
            c.messages.map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
              model_used: m.model_used ?? undefined,
              sources: m.sources,
            })),
          );
        })
        .catch(() => localStorage.removeItem(STORAGE_KEY));
    }
    void loadConversations();
  }, [loadConversations]);

  function startNewConversation() {
    setConversationId(null);
    setThread([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  async function loadConversation(id: string) {
    const c = await getConversation(id);
    setConversationId(id);
    localStorage.setItem(STORAGE_KEY, id);
    setThread(
      c.messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
        model_used: m.model_used ?? undefined,
        sources: m.sources,
      })),
    );
  }

  function requestDeleteConversation(id: string) {
    const preview =
      conversations.find((c) => c.id === id)?.preview?.trim() || "Untitled";
    setDeleteTarget({ id, preview });
  }

  function cancelDeleteConversation() {
    if (deletingId) return;
    setDeleteTarget(null);
  }

  async function confirmDeleteConversation() {
    if (!deleteTarget) return;
    const { id } = deleteTarget;
    setDeletingId(id);
    setError(null);
    try {
      await deleteConversation(id);
      setDeleteTarget(null);
      if (conversationId === id) {
        startNewConversation();
      }
      setConversations((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete conversation",
      );
    } finally {
      setDeletingId(null);
    }
  }

  const handleSubmit = async () => {
    if (!query.trim()) return;
    const userText = query.trim();
    setQuery("");
    setLoading(true);
    setError(null);
    setThread((prev) => [...prev, { role: "user", content: userText }]);

    try {
      const apiFilters = toApiFilters(filters);
      const result = await postQuery(userText, {
        conversationId: conversationId ?? undefined,
        synthesisLevel: strategic ? "strategic" : "standard",
        filters: Object.keys(apiFilters).length ? apiFilters : undefined,
      });
      setConversationId(result.conversation_id);
      localStorage.setItem(STORAGE_KEY, result.conversation_id);
      setThread((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.answer,
          model_used: result.model_used,
          sources: result.sources,
        },
      ]);
      void loadConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query failed");
      setThread((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const hasThread = thread.length > 0;

  return (
    <>
      <ConfirmDialog
        open={deleteTarget != null}
        title="Delete conversation?"
        description={
          <>
            <span className="block mb-2">
              This will permanently remove the conversation and all messages in
              it. This cannot be undone.
            </span>
            <span className="block rounded-md border bg-raised px-3 py-2 text-ink text-sm border-[color:var(--surface-border)]">
              {deleteTarget?.preview
                ? deleteTarget.preview.length > 160
                  ? `${deleteTarget.preview.slice(0, 160)}…`
                  : deleteTarget.preview
                : "Untitled"}
            </span>
          </>
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deletingId != null}
        onConfirm={() => void confirmDeleteConversation()}
        onCancel={cancelDeleteConversation}
      />

      <div className="flex -my-8 gap-6 lg:gap-8 items-start">
      {/* Recent sidebar */}
      <aside
        className="hidden lg:flex w-56 shrink-0 flex-col py-8 pr-4 border-r min-h-0"
        style={{ borderColor: "rgba(43, 44, 48, 0.1)" }}
      >
        <div className="recent-sidebar flex flex-col flex-1 min-h-0">
          <p className="section-label recent-sidebar-label mb-1.5">Recent</p>
          <ul className="space-y-0.5 flex-1 overflow-y-auto min-h-0 list-none p-0 m-0">
            {conversations.map((c) => {
              const isActive = conversationId === c.id;
              const isDeleting = deletingId === c.id;
              return (
                <li key={c.id} className="recent-sidebar-row group">
                  <button
                    type="button"
                    onClick={() => void loadConversation(c.id)}
                    disabled={isDeleting}
                    className={`recent-sidebar-item ${isActive ? "is-active" : ""}`}
                  >
                    <span className="recent-sidebar-item-preview">
                      {c.preview || "Untitled"}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="recent-sidebar-delete"
                    aria-label="Delete conversation"
                    title="Delete conversation"
                    disabled={isDeleting}
                    onClick={(e) => {
                      e.stopPropagation();
                      requestDeleteConversation(c.id);
                    }}
                  >
                    {isDeleting ? "…" : "×"}
                  </button>
                </li>
              );
            })}
            {conversations.length === 0 && (
              <li className="text-xs text-ink-dim py-1.5">
                No conversations yet
              </li>
            )}
          </ul>
        </div>
      </aside>

      {/* Center — chat-style */}
      <section className="flex-1 flex flex-col min-w-0 relative min-h-[calc(100vh-10rem)]">
        <div className="flex flex-wrap items-center justify-end gap-3 shrink-0 pt-2 pb-4 pr-1 z-10">
          {conversationId && (
            <button
              type="button"
              className="toolbar-btn text-stamp-orange"
              disabled={deletingId === conversationId}
              onClick={() => requestDeleteConversation(conversationId)}
            >
              {deletingId === conversationId ? "Deleting…" : "Delete chat"}
            </button>
          )}
          <button
            type="button"
            className="toolbar-btn"
            onClick={startNewConversation}
          >
            New conversation
          </button>
          <label className="toolbar-chip text-ink-secondary">
            <input
              type="checkbox"
              checked={strategic}
              onChange={(e) => setStrategic(e.target.checked)}
            />
            <span className="ui-chrome text-[14px] leading-snug">
              Strategic synthesis
            </span>
          </label>
        </div>

        {hasThread ? (
          <>
            <div className="flex-1 overflow-y-auto w-full max-w-3xl mx-auto pb-6 px-2 space-y-6 min-h-0">
              {thread.map((msg, i) =>
                msg.role === "user" ? (
                <div key={i} className="query-user-message">
                  <p className="query-user-message-text">{msg.content}</p>
                </div>
                ) : (
                  <div key={i} className="w-full">
                    <QueryResponseView
                      response={{
                        answer: msg.content,
                        sources: msg.sources ?? [],
                        conversation_id: conversationId ?? "",
                        model_used: msg.model_used ?? "",
                        retrieval_metadata: {
                          chunks_retrieved: msg.sources?.length ?? 0,
                          top_score: msg.sources?.[0]?.relevance_score ?? 0,
                        },
                      }}
                    />
                  </div>
                ),
              )}
            </div>
            <div className="shrink-0 flex flex-col items-center w-full px-4 pb-8 pt-2">
              <QueryInput
                value={query}
                onChange={setQuery}
                onSubmit={handleSubmit}
                loading={loading}
                compact
              />
              {error && (
                <p className="text-stamp-orange text-sm mt-4 text-center" role="alert">
                  {error}
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="absolute left-0 right-0 top-[3.25rem] bottom-0 flex flex-col items-center justify-center px-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-2xl flex flex-col items-center">
              <div className="text-center mb-8 max-w-lg">
                <p className="text-stamp-orange text-2xl mb-3" aria-hidden>
                  ✦
                </p>
                <h1 className="query-hero-title font-display text-3xl md:text-[2.35rem] font-semibold text-ink tracking-tight">
                  Ask Stamped
                </h1>
                <p className="text-ink-secondary text-sm mt-2">
                  Search your organizational knowledge base
                </p>
              </div>
              <QueryInput
                value={query}
                onChange={setQuery}
                onSubmit={handleSubmit}
                loading={loading}
              />
              {error && (
                <p className="text-stamp-orange text-sm mt-4 text-center" role="alert">
                  {error}
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      <QueryFilters
        filters={filters}
        onChange={setFilters}
        availableSourceTypes={sourceTypes}
        availableChannels={channels}
      />
    </div>
    </>
  );
}