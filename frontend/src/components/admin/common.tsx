"use client";

import Link from "next/link";
import type { AdminListingRow } from "@/lib/types";
import { formatDate, formatPrice } from "@/lib/format";
import type { CurrencyCode } from "@/lib/types";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-line text-ink-2", review: "bg-warn-bg text-warn-ink", needs_review: "bg-danger-soft text-danger",
  published: "bg-accent-soft text-accent", unpublished: "bg-line text-ink-2", archived: "bg-line text-ink-3",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? "bg-line"}`}>{status.replace("_", " ")}</span>;
}

export function ListingTable({ rows }: { rows: AdminListingRow[] }) {
  if (rows.length === 0) return <p className="rounded-md border border-line bg-surface p-4 text-sm text-ink-2">Nothing here.</p>;
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-line text-ink-3">
          <tr><th scope="col" className="p-3 font-normal">Listing</th><th scope="col" className="p-3 font-normal">Status</th><th scope="col" className="p-3 font-normal">Price</th><th scope="col" className="p-3 font-normal">Last checked</th><th scope="col" className="p-3 font-normal">Note</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-line last:border-0">
              <td className="p-3"><Link className="font-medium text-accent hover:underline" href={`/admin/listings/${r.id}/edit`}>{r.title}</Link>
                <div className="text-xs text-ink-3">{r.propertyType}{r.neighborhood ? ` · ${r.neighborhood}` : ""}{r.demonstration ? " · DEMO" : ""}</div></td>
              <td className="p-3"><StatusBadge status={r.status} /></td>
              <td className="p-3 tabular-nums">{formatPrice(r.askingPrice, r.currency as CurrencyCode)}</td>
              <td className="p-3">{formatDate(r.lastCheckedAt)}{r.stale && <span className="ml-1 text-xs text-danger">stale</span>}</td>
              <td className="p-3 text-ink-2">{r.reason ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
