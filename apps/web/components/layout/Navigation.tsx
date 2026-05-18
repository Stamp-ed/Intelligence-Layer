"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/query", label: "Query" },
  { href: "/ingest", label: "Ingest" },
  { href: "/documents", label: "Documents" },
  { href: "/entities", label: "Entities" },
  { href: "/graph", label: "Graph" },
  { href: "/admin", label: "Admin" },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <header className="border-b bg-ground" style={{ borderColor: "rgba(43,44,48,0.10)" }}>
      <div className="flex w-full items-center justify-between px-5 py-4 sm:px-8 lg:px-10 xl:px-12">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-lg font-bold text-ink shrink-0"
        >
          <Image
            src="/stamped-logo.png"
            alt="Stamped"
            width={32}
            height={32}
            className="h-8 w-8 object-contain"
            priority
          />
          Stamped Intelligence
        </Link>
        <nav className="flex flex-wrap gap-4 sm:gap-6 justify-end">
          {links.map((link) => {
            const active =
              pathname === link.href ||
              (link.href !== "/" && pathname.startsWith(`${link.href}/`));
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
