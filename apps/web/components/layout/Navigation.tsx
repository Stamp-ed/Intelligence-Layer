"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "./ThemeToggle";

const links = [
  { href: "/query", label: "Query" },
  { href: "/ingest", label: "Ingest" },
  { href: "/documents", label: "Documents" },
  { href: "/entities", label: "Entities" },
  { href: "/graph", label: "Map" },
  { href: "/admin", label: "Admin" },
];

function NavLinks({
  pathname,
  onNavigate,
  className = "",
}: {
  pathname: string;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <>
      {links.map((link) => {
        const active =
          pathname === link.href ||
          (link.href !== "/" && pathname.startsWith(`${link.href}/`));
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={`nav-link pb-1 border-b-2 transition-colors ${className} ${
              active
                ? "text-stamp-orange border-stamp-orange"
                : "text-ink-secondary border-transparent hover:text-stamp-orange"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
}

export function Navigation() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <header className="border-b bg-ground border-[color:var(--surface-border)] relative z-50">
      <div className="flex w-full items-center justify-between gap-3 px-5 py-4 sm:px-8 lg:px-10 xl:px-12">
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

        <nav
          className="hidden lg:flex flex-1 flex-wrap items-center justify-end gap-4 sm:gap-6"
          aria-label="Main"
        >
          <NavLinks pathname={pathname} />
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <ThemeToggle />

          <button
            type="button"
            className="nav-burger lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-panel"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="nav-burger-bar" />
            <span className="nav-burger-bar" />
            <span className="nav-burger-bar" />
          </button>
        </div>
      </div>

      {menuOpen && (
        <>
          <button
            type="button"
            className="nav-mobile-backdrop lg:hidden"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <nav
            id="mobile-nav-panel"
            className="nav-mobile-panel lg:hidden"
            aria-label="Main"
          >
            <NavLinks
              pathname={pathname}
              onNavigate={() => setMenuOpen(false)}
              className="nav-mobile-link"
            />
          </nav>
        </>
      )}
    </header>
  );
}
