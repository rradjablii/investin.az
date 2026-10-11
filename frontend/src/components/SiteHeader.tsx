"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, MapPinned } from "lucide-react";
import { useSaved } from "@/lib/saved";

const NAV = [
  { href: "/explore", label: "Explore" },
  { href: "/neighborhoods", label: "Neighborhoods" },
  { href: "/about", label: "About" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const { count } = useSaved();
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-line bg-surface px-3 sm:px-5">
      <Link href="/explore" className="flex items-center gap-2 font-semibold tracking-tight">
        <MapPinned className="h-5 w-5 text-accent" aria-hidden />
        <span>investin.az</span>
      </Link>
      <nav aria-label="Main" className="ml-2 hidden items-center gap-1 sm:flex">
        {NAV.map((n) => {
          const active = pathname === n.href || pathname.startsWith(n.href + "/");
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 text-sm ${active ? "bg-accent-soft font-medium text-accent" : "text-ink-2 hover:bg-bg"}`}
            >
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="ml-auto flex items-center gap-1">
        <nav aria-label="Secondary" className="flex items-center gap-1 sm:hidden">
          <Link href="/neighborhoods" className="rounded-md px-2 py-1.5 text-sm text-ink-2">Areas</Link>
          <Link href="/about" className="rounded-md px-2 py-1.5 text-sm text-ink-2">About</Link>
        </nav>
        <Link
          href="/saved"
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-ink-2 hover:bg-bg"
          aria-label={`Saved properties, ${count} saved`}
        >
          <Bookmark className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Saved</span>
          <span className="min-w-5 rounded-full bg-ink px-1.5 text-center text-xs font-medium text-white tabular-nums" suppressHydrationWarning>
            {count}
          </span>
        </Link>
      </div>
    </header>
  );
}
