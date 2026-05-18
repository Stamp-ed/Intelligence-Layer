"use client";

import { useCallback, useEffect, useState } from "react";
import {
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
    <div className="flex min-h-[calc(100vh-10rem)] -my-8">
      {/* Recent sidebar */}
      <aside
        className="hidden lg:flex w-60 shrink-0 flex-col py-8 pr-5 mr-6 border-r"
        style={{ borderColor: "rgba(43, 44, 48, 0.1)" }}
      >
        <p className="section-label mb-3">Recent</p>
        <ul className="space-y-0.5 flex-1 overflow-y-auto min-h-0">
          {conversations.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => void loadConversation(c.id)}
                className={`w-full text-left text-sm px-3 py-2.5 rounded-lg transition-colors ${
                  conversationId === c.id
                    ? "bg-raised font-semibold text-ink"
                    : "text-ink-secondary hover:bg-raised/80 hover:text-ink"
                }`}
              >
                <span className="line-clamp-2">{c.preview || "Untitled"}</span>
              </button>
            </li>
          ))}
          {conversations.length === 0 && (
            <li className="text-xs text-ink-dim px-3 py-2">No conversations yet</li>
          )}
        </ul>
      </aside>

      {/* Center — chat-style */}
      <section className="flex-1 flex flex-col min-w-0 relative">
        <div className="absolute top-6 right-0 z-10 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            className="btn-secondary text-sm"
            onClick={startNewConversation}
          >
            New conversation
          </button>
          <label className="flex items-center gap-2 text-sm text-ink-secondary cursor-pointer bg-card/80 px-3 py-1.5 rounded-lg border"
            style={{ borderColor: "rgba(43, 44, 48, 0.1)" }}
          >
            <input
              type="checkbox"
              checked={strategic}
              onChange={(e) => setStrategic(e.target.checked)}
              className="accent-stamp-orange"
            />
            Strategic synthesis
          </label>
        </div>

        {hasThread && (
          <div className="flex-1 overflow-y-auto w-full max-w-3xl mx-auto pt-16 pb-6 px-2 space-y-6">
            {thread.map((msg, i) =>
              msg.role === "user" ? (
                <div
                  key={i}
                  className="rounded-2xl px-5 py-4 ml-auto max-w-[85%]"
                  style={{ background: "#EEEDE7" }}
                >
                  <p className="text-ink whitespace-pre-wrap text-[15px] leading-relaxed">
                    {msg.content}
                  </p>
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
        )}

        <div className={`flex flex-col items-center w-full px-4 ${
          hasThread ? "pb-8 pt-2" : "flex-1 justify-center py-8"
        }`}
        >
          {!hasThread && (
            <div className="text-center mb-8 max-w-lg">
              <p className="text-stamp-orange text-2xl mb-3" aria-hidden>
                ✦
              </p>
              <h1 className="font-display text-3xl md:text-[2.35rem] font-semibold text-ink tracking-tight">
                Ask Stamped
              </h1>
              <p className="text-ink-secondary text-sm mt-2">
                Search your organizational knowledge base
              </p>
            </div>
          )}

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
      </section>

      <QueryFilters
        filters={filters}
        onChange={setFilters}
        availableSourceTypes={sourceTypes}
        availableChannels={channels}
      />
    </div>
  );
}
