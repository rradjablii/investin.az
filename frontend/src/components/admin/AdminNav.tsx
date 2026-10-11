"use client";

/* eslint-disable @next/next/no-location-assign-relative-destination -- full page load on purpose so server components re-check the session cookie */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminLogout } from "@/lib/admin-api";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/listings", label: "Listings" },
  { href: "/admin/review", label: "Review queue" },
];

export default function AdminNav({ email, role }: { email: string; role: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="flex flex-wrap items-center gap-1 border-b border-line pb-3">
      {(role === "ADMIN" ? [...LINKS, { href: "/admin/users", label: "Users" }] : LINKS).map((l) => (
        <Link key={l.href} href={l.href} aria-current={pathname === l.href ? "page" : undefined}
          className={`rounded-md px-3 py-1.5 text-sm ${pathname === l.href ? "bg-accent-soft font-medium text-accent" : "text-ink-2 hover:bg-bg"}`}>{l.label}</Link>
      ))}
      <span className="ml-auto text-xs text-ink-3">{email} · {role}</span>
      <button type="button" className="rounded-md px-3 py-1.5 text-sm text-ink-2 hover:bg-bg"
        onClick={async () => { await adminLogout(); window.location.assign("/admin/login"); }}>Sign out</button>
    </nav>
  );
}
