"use client";

import { useEffect, useState } from "react";
import { getHealth, getStats, type HealthResponse, type StatsResponse } from "@/lib/api";

function StatusBadge({ ok }: { ok: boolean | string }) {
  const good =
    ok === true || ok === "ok";
  const label =
    typeof ok === "string"
      ? ok
      : ok
        ? "ok"
        : "down";
  return (
    <span
      className={`inline-flex items-center gap-1 text-sm font-semibold ${
        good ? "text-semantic-verified" : ok === "stale" ? "text-semantic-review" : "text-stamp-orange"
      }`}
    >
      {good ? "✓" : ok === "stale" ? "~" : "✗"} {typeof ok === "string" ? label : ""}
    </span>
  );
}

export default function AdminPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getHealth(), getStats()])
      .then(([h, s]) => {
        setHealth(h);
        setStats(s);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load admin data"),
      );
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <p className="section-label">Admin</p>
        <h1 className="text-2xl font-bold text-ink mt-1">System status</h1>
      </div>

      {error && (
        <p className="text-stamp-orange text-sm" role="alert">
          {error}
        </p>
      )}

      {health && (
        <section className="card p-6">
          <h2 className="font-semibold mb-4">Health</h2>
          <p className="text-sm text-ink-secondary mb-4">
            Overall: <strong>{health.status}</strong>
          </p>
          <ul className="space-y-2 text-sm">
            {Object.entries(health.services).map(([name, ok]) => (
              <li key={name} className="flex justify-between capitalize">
                <span>{name}</span>
                <StatusBadge ok={ok} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {stats && (
        <section className="card p-6">
          <h2 className="font-semibold mb-4">Statistics</h2>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {[
              ["Documents", stats.documents],
              ["Chunks", stats.chunks],
              ["Entities", stats.entities],
              ["Relationships", stats.relationships],
              [
                "Project graph nodes",
                stats.graph_project_nodes ?? stats.graph_nodes ?? 0,
              ],
              [
                "Corpus graph nodes",
                stats.graph_corpus_nodes ?? 0,
              ],
              ["Ingestion jobs", stats.ingestion_jobs],
              ["Queries", stats.queries],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <dt className="section-label">{label}</dt>
                <dd className="text-2xl font-bold text-ink mt-1">
                  <span>{value}</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}
