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

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <aside className="hidden lg:block w-56 shrink-0 space-y-3">
        <p className="section-label">Recent</p>
        <ul className="space-y-1 max-h-[50vh] overflow-y-auto">
          {conversations.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => void loadConversation(c.id)}
                className={`w-full text-left text-sm px-2 py-2 rounded-md hover:bg-raised ${
                  conversationId === c.id ? "bg-raised font-semibold" : ""
                }`}
              >
                {c.preview || "Untitled"}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="flex-1 space-y-8 min-w-0">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="section-label">Query</p>
            <h1 className="text-2xl font-bold text-ink mt-1">
              Ask the knowledge base
            </h1>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              className="btn-secondary text-sm"
              onClick={startNewConversation}
            >
              New conversation
            </button>
            <label className="flex items-center gap-2 text-sm text-ink-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={strategic}
                onChange={(e) => setStrategic(e.target.checked)}
                className="accent-stamp-orange"
              />
              Strategic synthesis
            </label>
          </div>
        </header>

        {thread.length > 0 && (
          <div className="space-y-6">
            {thread.map((msg, i) =>
              msg.role === "user" ? (
                <div
                  key={i}
                  className="card p-4 mr-0 lg:mr-12"
                  style={{ background: "#EEEDE7" }}
                >
                  <p className="section-label mb-1">You</p>
                  <p className="text-ink whitespace-pre-wrap">{msg.content}</p>
                </div>
              ) : (
                <div key={i} className="ml-0 lg:ml-4">
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

        <QueryInput
          value={query}
          onChange={setQuery}
          onSubmit={handleSubmit}
          loading={loading}
        />

        {error && (
          <p className="text-stamp-orange text-sm" role="alert">
            {error}
          </p>
        )}
      </div>

      <QueryFilters
        filters={filters}
        onChange={setFilters}
        availableSourceTypes={sourceTypes}
        availableChannels={channels}
      />
    </div>
  );
}
