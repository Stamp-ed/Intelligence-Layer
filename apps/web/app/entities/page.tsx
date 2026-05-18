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

const ENTITY_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All types" },
  { value: "insurer", label: "Insurer" },
  { value: "competitor", label: "Competitor" },
  { value: "product_module", label: "Product module" },
  { value: "fraud_type", label: "Fraud type" },
  { value: "regulation", label: "Regulation" },
  { value: "market_concept", label: "Market concept" },
];

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
        <h1 className="text-[1.75rem] font-medium text-ink mt-1">Knowledge entities</h1>
        <p className="text-sm text-ink-secondary mt-2">
          {total} entities extracted from your corpus
        </p>
      </div>

      <div className="filter-sidebar max-w-2xl flex-row flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[240px]">
          <label className="field-label">Search entities</label>
          <input
            type="search"
            placeholder="Search entities…"
            className="input w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="min-w-[160px]">
          <label className="field-label">Type</label>
          <select
            className="form-select"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
          >
            {ENTITY_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value || "all"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
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
                <span className="table-link">{entity.name}</span>
                <span
                  className={`type-badge ${TYPE_COLORS[entity.entity_type] ?? "text-ink-secondary"}`}
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
