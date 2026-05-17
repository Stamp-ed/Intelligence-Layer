"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/query", label: "Query" },
  { href: "/ingest", label: "Ingest" },
  { href: "/admin", label: "Admin" },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <header className="border-b bg-ground" style={{ borderColor: "rgba(43,44,48,0.10)" }}>
      <div className="mx-auto flex max-w-content items-center justify-between px-6 py-4 md:px-12">
        <Link href="/" className="text-lg font-bold text-ink">
          Stamped Intelligence
        </Link>
        <nav className="flex gap-6">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${
                  active
                    ? "text-stamp-orange border-stamp-orange"
                    : "text-ink-secondary border-transparent hover:text-stamp-orange"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
