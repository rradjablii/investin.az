"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import PropertyCard from "./PropertyCard";
import { PrimaryButton, SecondaryButton, StateMessage } from "@/components/ui/StateMessage";
import { SORT_OPTIONS, type FilterChip, type SortKey } from "@/lib/filters";
import type { PropertySummary } from "@/lib/types";

interface Props {
  items: PropertySummary[];
  total: number | null;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  onRetry: () => void;
  hasNext: boolean;
  isFetchingNext: boolean;
  onLoadMore: () => void;
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
  detailHref: (slug: string) => string;
  chips: FilterChip[];
  onRemoveChip: (id: string) => void;
  onResetAll: () => void;
  sort: SortKey;
  currencySelected: boolean;
  onSort: (s: SortKey) => void;
  mapUnavailable: boolean;
}

export default function ResultsPanel(p: Props) {
  const selectedRef = useRef<HTMLLIElement | null>(null);
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest" });
  }, [p.selectedSlug]);

  const countText = p.total === null ? "" : `${p.total.toLocaleString("en")} ${p.total === 1 ? "property" : "properties"}${p.mapUnavailable ? "" : " in this area"}`;

  return (
    <div className="flex h-full min-h-0 flex-col bg-bg">
      {p.chips.length > 0 && (
        <ul aria-label="Active filters" className="flex flex-wrap items-center gap-1.5 border-b border-line bg-surface px-3 py-2">
          {p.chips.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => p.onRemoveChip(c.id)} aria-label={`Remove filter ${c.label}`}
                className="inline-flex items-center gap-1 rounded-full border border-line-2 bg-bg py-1 pl-2.5 pr-1.5 text-xs hover:bg-line">
                {c.label} <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </li>
          ))}
          <li><button type="button" onClick={p.onResetAll} className="px-1.5 text-xs font-medium text-accent hover:underline">Reset all</button></li>
        </ul>
      )}

      <div className="flex items-center justify-between gap-2 border-b border-line bg-surface px-3 py-2">
        <p aria-live="polite" className="min-w-0 flex-1 text-sm text-ink-2" data-testid="result-count">
          {p.isLoading ? "Searching…" : countText}
          {p.isFetching && !p.isLoading && <span className="ml-2 text-xs text-ink-3">updating…</span>}
        </p>
        <label className="flex shrink-0 items-center gap-1.5 text-sm">
          <span className="sr-only">Sort</span>
          <select value={p.sort} onChange={(e) => p.onSort(e.target.value as SortKey)} aria-label="Sort results"
            className="h-8 w-40 rounded-md border border-line-2 bg-surface px-1.5 text-sm">
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} disabled={o.needsCurrency && !p.currencySelected}>
                {o.label}{o.needsCurrency && !p.currencySelected ? " (choose a currency)" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {p.isLoading ? (
          <ul aria-busy="true" aria-label="Loading results" className="space-y-3">
            {[0, 1, 2].map((i) => (
              <li key={i} className="overflow-hidden rounded-lg border border-line bg-surface">
                <div className="skeleton aspect-[16/10]" />
                <div className="space-y-2 p-3"><div className="skeleton h-5 w-1/3 rounded" /><div className="skeleton h-4 w-2/3 rounded" /></div>
              </li>
            ))}
          </ul>
        ) : p.error ? (
          <StateMessage tone="error" title="We couldn't load properties"
            action={<PrimaryButton onClick={p.onRetry}>Try again</PrimaryButton>}>
            {p.error.message}
          </StateMessage>
        ) : p.items.length === 0 ? (
          <StateMessage title="No properties match here"
            action={p.chips.length > 0 ? <SecondaryButton onClick={p.onResetAll}>Reset all filters</SecondaryButton> : undefined}>
            {p.chips.length > 0 ? "Try removing a filter or moving the map." : "Move or zoom the map to explore other areas of Baku."}
          </StateMessage>
        ) : (
          <>
            <ul className="space-y-3" aria-label="Property results">
              {p.items.map((it) => (
                <PropertyCard key={it.slug} property={it} selected={it.slug === p.selectedSlug}
                  ref={it.slug === p.selectedSlug ? selectedRef : undefined}
                  onSelect={p.onSelect} detailHref={p.detailHref(it.slug)} />
              ))}
            </ul>
            {p.hasNext && (
              <div className="mt-3 flex justify-center">
                <SecondaryButton onClick={p.onLoadMore} disabled={p.isFetchingNext}>
                  {p.isFetchingNext ? "Loading…" : "Show more"}
                </SecondaryButton>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
