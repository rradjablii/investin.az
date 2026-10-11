"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark } from "lucide-react";
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
    <header className="flex h-12 shrink-0 items-center gap-5 border-b border-line bg-bg px-4 sm:px-6">
      <Link href="/explore" className="text-[1.0625rem] font-semibold tracking-tight text-ink" aria-label="investin.az, explore">
        investin<span className="text-accent">.az</span>
      </Link>
      <nav aria-label="Main" className="hidden items-center gap-1 sm:flex">
        {NAV.map((n) => {
          const active = pathname === n.href || pathname.startsWith(n.href + "/");
          return (
            <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 text-body ${active ? "font-medium text-ink" : "text-ink-2 hover:bg-hover hover:text-ink"}`}>
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="ml-auto flex items-center gap-1">
        <nav aria-label="Secondary" className="flex items-center gap-1 sm:hidden">
          <Link href="/neighborhoods" className="rounded-md px-2 py-1.5 text-body text-ink-2">Areas</Link>
          <Link href="/about" className="rounded-md px-2 py-1.5 text-body text-ink-2">About</Link>
        </nav>
        <Link href="/saved" aria-label={`Saved properties, ${count} saved`} aria-current={pathname === "/saved" ? "page" : undefined}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-body hover:bg-hover ${pathname === "/saved" ? "font-medium text-ink" : "text-ink-2"}`}>
          <Bookmark className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Saved</span>
          <span className="min-w-5 rounded-full bg-surface-2 px-1.5 text-center text-xs font-medium tabular-nums text-ink-2 ring-1 ring-line" suppressHydrationWarning>{count}</span>
        </Link>
      </div>
    </header>
  );
}
