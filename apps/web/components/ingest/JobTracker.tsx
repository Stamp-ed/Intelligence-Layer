"use client";

import { useEffect, useState } from "react";
import {
  getIngestionJob,
  listIngestionJobs,
  type IngestionJob,
} from "@/lib/api";

function statusClass(status: string): string {
  switch (status) {
    case "completed":
      return "text-semantic-verified";
    case "failed":
      return "text-stamp-orange";
    case "running":
      return "text-semantic-info";
    default:
      return "text-ink-secondary";
  }
}

export function JobTracker({ activeJobId }: { activeJobId?: string | null }) {
  const [jobs, setJobs] = useState<IngestionJob[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await listIngestionJobs();
        if (!cancelled) {
          setJobs(data.jobs);
          setError(null);
        }
        if (activeJobId) {
          const job = await getIngestionJob(activeJobId);
          if (!cancelled) {
            setJobs((prev) => {
              const rest = prev.filter((j) => j.id !== job.id);
              return [job, ...rest];
            });
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load jobs");
        }
      }
    };

    load();
    const interval = setInterval(load, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeJobId]);

  if (error) {
    return <p className="text-sm text-stamp-orange">{error}</p>;
  }

  if (jobs.length === 0) {
    return <p className="text-sm text-ink-secondary">No ingestion jobs yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-high-raised text-left">
            <th className="table-header-label px-3 py-2 text-left">
              Type
            </th>
            <th className="table-header-label px-3 py-2 text-left">
              Status
            </th>
            <th className="table-header-label px-3 py-2 text-left">
              Progress
            </th>
            <th className="table-header-label px-3 py-2 text-left">
              Created
            </th>
            <th className="table-header-label px-3 py-2 text-left">
              Error
            </th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => {
            const total = job.totalItems ?? 1;
            const done = job.processedItems + job.failedItems;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;

            return (
              <tr
                key={job.id}
                className="border-b"
                style={{ borderColor: "rgba(43,44,48,0.08)" }}
              >
                <td className="px-3 py-2 font-mono text-xs">{job.jobType}</td>
                <td className={`px-3 py-2 type-badge ${statusClass(job.status)}`}>
                  {job.status}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-1.5 flex-1 max-w-[120px] rounded bg-raised overflow-hidden"
                    >
                      <div
                        className="h-full bg-stamp-orange"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-ink-dim">
                      {job.processedItems}/{total}
                      {job.failedItems > 0 && ` (${job.failedItems} failed)`}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2 text-xs text-ink-secondary">
                  {new Date(job.createdAt).toLocaleString()}
                </td>
                <td className="px-3 py-2 text-xs text-stamp-orange max-w-xs truncate">
                  {job.status === "failed" && job.errorLog ? job.errorLog : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
