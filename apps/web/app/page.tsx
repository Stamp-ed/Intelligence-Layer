import Image from "next/image";
import Link from "next/link";

const FEATURES = [
  {
    href: "/query",
    title: "Ask",
    description:
      "Natural-language search over your corpus with cited sources and optional strategic synthesis.",
    accent: "✦",
  },
  {
    href: "/ingest",
    title: "Add knowledge",
    description:
      "Paste text, upload files, or import Discord exports — chunked and indexed automatically.",
    accent: "↑",
  },
  {
    href: "/documents",
    title: "Documents",
    description:
      "Browse, filter, and open everything in your knowledge base by channel, type, and date.",
    accent: "◇",
  },
  {
    href: "/graph",
    title: "Knowledge graph",
    description:
      "Explore corpus structure and channel clusters — simple Graph RAG with priority channels.",
    accent: "◎",
  },
  {
    href: "/entities",
    title: "Entities",
    description:
      "Insurers, regulations, products, and concepts extracted from ingested material.",
    accent: "◆",
  },
] as const;

export default function HomePage() {
  return (
    <div className="space-y-12 pb-8">
      <section className="home-hero max-w-5xl mx-auto w-full">
        <div className="flex flex-col items-center">
          <Image
            src="/stamped-logo.png"
            alt=""
            width={56}
            height={56}
            className="h-14 w-14 object-contain mb-6"
            priority
          />
          <p className="section-label mb-3">Stamped Intelligence</p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink tracking-tight max-w-xl">
            Your team&apos;s knowledge, searchable and cited
          </h1>
          <p className="text-[15px] text-ink-secondary mt-4 max-w-lg leading-relaxed">
            Ingest organizational knowledge, ask questions in plain language, and
            get answers grounded in your documents — with sources you can verify.
          </p>
          <div className="home-cta-row">
            <Link href="/query" className="home-cta-primary">
              Ask Stamped
            </Link>
            <Link href="/ingest" className="home-cta-secondary">
              Add knowledge
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto w-full">
        <p className="field-label mb-4 px-1">Explore</p>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <li key={feature.href}>
              <Link href={feature.href} className="home-feature-card group">
                <span
                  className="text-stamp-orange text-lg mb-3 block opacity-80"
                  aria-hidden
                >
                  {feature.accent}
                </span>
                <h2 className="home-feature-title">{feature.title}</h2>
                <p className="text-sm text-ink-secondary mt-2 leading-relaxed">
                  {feature.description}
                </p>
                <span className="ui-chrome text-xs text-stamp-orange mt-4 inline-block group-hover:underline">
                  Open →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
