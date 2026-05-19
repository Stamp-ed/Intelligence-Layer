"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

const links = [
  { href: "/query", label: "Query" },
  { href: "/ingest", label: "Ingest" },
  { href: "/documents", label: "Documents" },
  { href: "/entities", label: "Entities" },
  { href: "/graph", label: "Map" },
  { href: "/admin", label: "Admin" },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <header className="border-b bg-ground border-[color:var(--surface-border)]">
      <div className="flex w-full items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10 xl:px-12">
        <Link href="/" className="brand-title flex items-center gap-2.5 shrink-0 min-w-0">
          <Image
            src="/stamped-logo.png"
            alt="Stamped"
            width={32}
            height={32}
            className="brand-logo h-8 w-8 object-contain shrink-0"
            priority
          />
          <span className="hidden sm:inline truncate">Stamped Intelligence</span>
        </Link>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 justify-end">
          <ThemeToggle />
          <nav className="flex flex-wrap gap-4 sm:gap-6 justify-end">
            {links.map((link) => {
              const active =
                pathname === link.href ||
                (link.href !== "/" && pathname.startsWith(`${link.href}/`));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`nav-link pb-1 border-b-2 transition-colors ${
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
      </div>
    </header>
  );
}
