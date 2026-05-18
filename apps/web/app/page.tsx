import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="section-label">Stamped Intelligence</p>
        <h1 className="text-3xl font-bold text-ink mt-2">
          Organizational Knowledge System
        </h1>
        <p className="text-ink-secondary mt-3 max-w-[72ch]">
          Ingest team knowledge, query it in natural language, and receive
          source-attributed answers.
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        <Link href="/query" className="btn-primary">
          Ask a Question
        </Link>
        <Link href="/ingest" className="btn-secondary">
          Add Knowledge
        </Link>
        <Link href="/documents" className="btn-secondary">
          Browse Documents
        </Link>
        <Link href="/graph" className="btn-secondary">
          Knowledge Graph
        </Link>
        <Link href="/entities" className="btn-secondary">
          Browse Entities
        </Link>
      </div>
    </div>
  );
}
