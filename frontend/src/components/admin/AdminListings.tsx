"use client";

import Link from "next/link";
import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin-api";
import type { AdminListingPage } from "@/lib/types";
import { ListingTable } from "./common";
import { SecondaryButton, Spinner } from "@/components/ui/StateMessage";

const STATUSES = ["", "draft", "review", "needs_review", "published", "unpublished", "archived"];

export default function AdminListings({ mode }: { mode: "all" | "review" }) {
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const path = mode === "review" ? "/api/v1/admin/review-queue" : "/api/v1/admin/listings";
  const params = new URLSearchParams({ page: String(page), size: "25" });
  if (mode === "all" && status) params.set("status", status);
  if (mode === "all" && q.trim()) params.set("q", q.trim());
  const { data, isPending, isError, error, isFetching } = useQuery({
    queryKey: ["admin", "listings", mode, status, q, page],
    queryFn: () => adminFetch<AdminListingPage>(`${path}?${params}`),
    placeholderData: keepPreviousData,
  });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{mode === "review" ? "Review queue" : "Listings"}</h1>
        <Link href="/admin/listings/new" className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink">New listing</Link>
      </div>
      {mode === "review" && <p className="text-sm text-ink-2">Listings awaiting review, flagged as possibly stale, or published but not re-checked recently.</p>}
      {mode === "all" && (
        <div className="flex flex-wrap gap-2">
          <label className="text-sm">Status{" "}
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className="h-9 rounded border border-line-2 px-2">
              {STATUSES.map((s) => <option key={s} value={s}>{s === "" ? "All" : s.replace("_", " ")}</option>)}
            </select>
          </label>
          <label className="text-sm">Search{" "}
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} className="h-9 rounded border border-line-2 px-2" placeholder="Title contains…" />
          </label>
        </div>
      )}
      {isPending ? <Spinner /> : isError ? <p role="alert" className="text-danger">{(error as Error).message}</p> : (
        <>
          <ListingTable rows={data.items} />
          <div className="flex items-center justify-between text-sm text-ink-2">
            <span>{data.total} total{isFetching ? " · updating…" : ""}</span>
            <span className="flex gap-2">
              <SecondaryButton disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</SecondaryButton>
              <SecondaryButton disabled={(page + 1) * data.size >= data.total} onClick={() => setPage((p) => p + 1)}>Next</SecondaryButton>
            </span>
          </div>
        </>
      )}
    </div>
  );
}
