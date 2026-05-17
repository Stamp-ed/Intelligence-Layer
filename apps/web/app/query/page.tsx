"use client";

import { useState } from "react";
import { postQuery, type QueryResponse } from "@/lib/api";
import { QueryInput } from "@/components/query/QueryInput";
import { QueryResponse as QueryResponseView } from "@/components/query/QueryResponse";

export default function QueryPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<QueryResponse | null>(null);

  const handleSubmit = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await postQuery(query.trim());
      setResponse(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="section-label">Query</p>
        <h1 className="text-2xl font-bold text-ink mt-1">Ask the knowledge base</h1>
      </div>

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

      {response && <QueryResponseView response={response} />}
    </div>
  );
}
