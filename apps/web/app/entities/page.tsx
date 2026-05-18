"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listEntities, type EntitySummary } from "@/lib/api";

const TYPE_COLORS: Record<string, string> = {
  insurer: "text-semantic-info",
  competitor: "text-orange-deep",
  regulation: "text-semantic-review",
  product_module: "text-semantic-verified",
  fraud_type: "text-stamp-orange",
};

export default function EntitiesPage() {
  const [entities, setEntities] = useState<EntitySummary[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [entityType, setEntityType] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listEntities({
      search: search || undefined,
      entity_type: entityType || undefined,
      page_size: 50,
    })
      .then((res) => {
        setEntities(res.entities);
        setTotal(res.total);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load entities"),
      );
  }, [search, entityType]);

  return (
    <div className="space-y-6">
      <div>
        <p className="section-label">Entities</p>
        <h1 className="text-2xl font-bold text-ink mt-1">Knowledge entities</h1>
        <p className="text-sm text-ink-secondary mt-2">
          {total} entities extracted from your corpus
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        <input
          type="search"
          placeholder="Search entities…"
          className="input flex-1 min-w-[240px] max-w-xl"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input w-auto min-w-[160px]"
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
        >
          <option value="">All types</option>
          <option value="insurer">Insurer</option>
          <option value="competitor">Competitor</option>
          <option value="product_module">Product module</option>
          <option value="fraud_type">Fraud type</option>
          <option value="regulation">Regulation</option>
          <option value="market_concept">Market concept</option>
        </select>
      </div>

      {error && (
        <p className="text-stamp-orange text-sm" role="alert">
          {error}
        </p>
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {entities.map((entity) => (
          <li key={entity.id}>
            <Link href={`/entities/${entity.id}`} className="card block p-4 hover:border-stamp-orange/30">
              <div className="flex justify-between items-start gap-2">
                <span className="font-semibold text-ink">{entity.name}</span>
                <span
                  className={`text-xs font-semibold uppercase ${TYPE_COLORS[entity.entity_type] ?? "text-ink-secondary"}`}
                >
                  {entity.entity_type.replace(/_/g, " ")}
                </span>
              </div>
              {entity.description && (
                <p className="text-sm text-ink-secondary mt-2 line-clamp-2">
                  {entity.description}
                </p>
              )}
              <p className="text-xs text-ink-secondary mt-2">
                {entity.mention_count} mentions
              </p>
            </Link>
          </li>
        ))}
      </ul>

      {entities.length === 0 && !error && (
        <p className="text-sm text-ink-secondary">
          No entities yet. Ingest documents — extraction runs automatically — or rebuild the graph.
        </p>
      )}
    </div>
  );
}
