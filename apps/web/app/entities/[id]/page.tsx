"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getEntity, type EntityDetail } from "@/lib/api";

export default function EntityDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [entity, setEntity] = useState<EntityDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getEntity(id)
      .then(setEntity)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Entity not found"),
      );
  }, [id]);

  if (error) {
    return <p className="text-stamp-orange text-sm">{error}</p>;
  }

  if (!entity) {
    return <p className="text-ink-secondary text-sm">Loading…</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/entities" className="text-sm text-ink-secondary hover:text-stamp-orange">
          ← Entities
        </Link>
        <h1 className="text-[1.75rem] font-medium text-ink mt-2">{entity.name}</h1>
        <p className="text-sm text-ink-secondary mt-1 flex flex-wrap items-center gap-2">
          <span className="type-badge text-ink-secondary">
            {entity.entity_type.replace(/_/g, " ")}
          </span>
          <span>{entity.mention_count} mentions</span>
        </p>
        {entity.description && (
          <p className="text-ink mt-4 max-w-2xl">{entity.description}</p>
        )}
        {entity.graph_node_id && (
          <Link href="/graph" className="inline-block mt-4 text-sm font-semibold text-stamp-orange">
            View in knowledge graph →
          </Link>
        )}
      </div>

      <section className="card p-6">
        <h2 className="mb-4">Related entities</h2>
        {entity.related_entities.length === 0 ? (
          <p className="text-sm text-ink-secondary">No relationships recorded yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {entity.related_entities.map((r) => (
              <li key={`${r.id}-${r.direction}`}>
                <Link href={`/entities/${r.id}`} className="table-link">
                  {r.name}
                </Link>
                <span className="text-ink-secondary">
                  {" "}
                  — {r.relationship_type ?? "related"} ({r.direction})
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-6">
        <h2 className="mb-4">Mentions</h2>
        <ul className="space-y-4">
          {entity.mentions.map((m) => (
            <li key={m.chunk_id} className="border-b pb-4 last:border-0" style={{ borderColor: "rgba(43,44,48,0.08)" }}>
              <Link
                href={`/documents/${m.document_id}`}
                className="table-link"
              >
                {m.title}
              </Link>
              {m.channel && (
                <span className="text-xs text-ink-secondary ml-2">{m.channel}</span>
              )}
              <p className="text-sm text-ink-secondary mt-2">{m.excerpt}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
