"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { AdminSummary, DataSourceItem, InquiryItem } from "@/lib/types";
import { SecondaryButton, Spinner } from "@/components/ui/StateMessage";

export default function AdminOverview() {
  const qc = useQueryClient();
  const summary = useQuery({ queryKey: ["admin", "summary"], queryFn: () => adminFetch<AdminSummary>("/api/v1/admin/summary") });
  const sources = useQuery({ queryKey: ["admin", "sources"], queryFn: () => adminFetch<DataSourceItem[]>("/api/v1/admin/data-sources") });
  const inquiries = useQuery({ queryKey: ["admin", "inquiries"], queryFn: () => adminFetch<InquiryItem[]>("/api/v1/admin/inquiries") });
  const setStatus = useMutation({
    mutationFn: (v: { id: string; status: string }) => adminFetch<void>(`/api/v1/admin/inquiries/${v.id}/status`, { method: "POST", json: { status: v.status } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "inquiries"] }); qc.invalidateQueries({ queryKey: ["admin", "summary"] }); },
  });
  const [srcError, setSrcError] = useState<string | null>(null);
  const addSource = useMutation({
    mutationFn: (json: unknown) => adminFetch<DataSourceItem>("/api/v1/admin/data-sources", { method: "POST", json }),
    onSuccess: () => { setSrcError(null); qc.invalidateQueries({ queryKey: ["admin", "sources"] }); },
    onError: (e) => setSrcError(e instanceof ApiError ? (e.status === 403 ? "Only administrators can add data sources." : [e.message, ...e.details].join(" — ")) : "Failed"),
  });

  return (
    <div className="space-y-8">
      <section aria-labelledby="ov">
        <div className="flex items-center justify-between"><h1 id="ov" className="text-[1.5rem] font-semibold">Catalog overview</h1>
          <Link href="/admin/listings/new" className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink">New listing</Link></div>
        {summary.isPending ? <Spinner /> : summary.isError ? <p role="alert" className="text-danger">Couldn&apos;t load summary.</p> : (
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {Object.entries(summary.data.listingsByStatus).map(([k, v]) => (
              <div key={k} className="rounded-xl border border-line bg-surface p-3"><dt className="text-xs capitalize text-ink-3">{k.replace("_", " ")}</dt><dd className="text-xl font-semibold tabular-nums">{v}</dd></div>
            ))}
            <div className="rounded-xl border border-line bg-surface p-3"><dt className="text-xs text-ink-3">Stale published</dt><dd className="text-xl font-semibold tabular-nums">{summary.data.staleCount}</dd></div>
            <div className="rounded-xl border border-line bg-surface p-3"><dt className="text-xs text-ink-3">New inquiries</dt><dd className="text-xl font-semibold tabular-nums">{summary.data.newInquiries}</dd></div>
          </dl>
        )}
      </section>

      <section aria-labelledby="inq">
        <h2 id="inq" className="text-lg font-semibold">Inquiries</h2>
        {inquiries.isPending ? <Spinner /> : inquiries.isError ? <p role="alert" className="text-danger">Couldn&apos;t load inquiries.</p> : inquiries.data.length === 0 ? (
          <p className="mt-2 text-sm text-ink-2">No inquiries yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line rounded-xl border border-line bg-surface">
            {inquiries.data.slice(0, 20).map((i) => (
              <li key={i.id} className="space-y-1 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p><span className="font-medium">{i.name}</span> <span className="text-ink-3">&lt;{i.email}&gt;{i.phone ? ` · ${i.phone}` : ""}</span></p>
                  <p className="text-xs text-ink-3">{formatDate(i.createdAt)} · {i.listingTitle}</p>
                </div>
                <p className="whitespace-pre-line text-ink-2">{i.message}</p>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-ink-3" htmlFor={`st-${i.id}`}>Status</label>
                  <select id={`st-${i.id}`} value={i.status} onChange={(e) => setStatus.mutate({ id: i.id, status: e.target.value })} className="h-8 rounded border border-line-2 px-1 text-sm">
                    {["new", "forwarded", "closed", "spam"].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="ds">
        <h2 id="ds" className="text-lg font-semibold">Data sources</h2>
        <p className="text-sm text-ink-2">Every listing is attached to a source. A listing can only be published when its source&apos;s permission status is granted or not required.</p>
        {sources.data && (
          <ul className="mt-2 divide-y divide-line rounded-xl border border-line bg-surface text-sm">
            {sources.data.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <span className="font-medium">{s.name}{s.demonstration && <span className="ml-2 rounded bg-warn-bg px-1.5 text-xs text-warn-ink">demo</span>}</span>
                <span className="text-ink-3">{s.sourceType} · permission: {s.permissionStatus}</span>
              </li>
            ))}
          </ul>
        )}
        <form className="mt-3 grid gap-2 rounded-xl border border-line bg-surface p-3 sm:grid-cols-4" onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          addSource.mutate({ name: f.get("name"), sourceType: f.get("sourceType"), permissionStatus: f.get("permissionStatus"), sourceUrl: f.get("sourceUrl") || null, attributionRequirements: f.get("attribution") || null });
          e.currentTarget.reset();
        }}>
          <input name="name" required placeholder="Source name" aria-label="Source name" className="h-9 rounded border border-line-2 px-2 text-sm" />
          <select name="sourceType" aria-label="Source type" className="h-9 rounded border border-line-2 px-2 text-sm">{["agency", "developer", "owner", "public_dataset", "editorial"].map((s) => <option key={s}>{s}</option>)}</select>
          <select name="permissionStatus" aria-label="Permission status" className="h-9 rounded border border-line-2 px-2 text-sm">{["pending", "granted", "not_required"].map((s) => <option key={s}>{s}</option>)}</select>
          <input name="sourceUrl" placeholder="Source URL (optional)" aria-label="Source URL" className="h-9 rounded border border-line-2 px-2 text-sm" />
          <input name="attribution" placeholder="Attribution requirements" aria-label="Attribution requirements" className="h-9 rounded border border-line-2 px-2 text-sm sm:col-span-3" />
          <SecondaryButton type="submit" disabled={addSource.isPending}>Add source</SecondaryButton>
          {srcError && <p role="alert" className="text-sm text-danger sm:col-span-4">{srcError}</p>}
        </form>
      </section>
    </div>
  );
}
