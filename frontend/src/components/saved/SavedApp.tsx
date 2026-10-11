"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { Bookmark, GitCompare, Trash2 } from "lucide-react";
import PropertyImage from "@/components/ui/PropertyImage";
import { PrimaryButton, SecondaryButton, StateMessage } from "@/components/ui/StateMessage";
import { ApiError, fetchProperty } from "@/lib/api";
import { formatArea, formatDate, formatPrice, STATUS_LABELS, TYPE_LABELS } from "@/lib/format";
import { MAX_COMPARE, useSaved } from "@/lib/saved";
import type { PropertyDetail } from "@/lib/types";

type Entry = { slug: string; state: "loading" | "ok" | "unavailable" | "error"; data?: PropertyDetail };

const ROWS: { label: string; value: (p: PropertyDetail) => string | null }[] = [
  { label: "Asking price", value: (p) => `${formatPrice(p.askingPrice, p.currency)} (${p.currency})` },
  {
    // Derived only when an area is stated; stays in the listing's own currency, so it is comparable only across equal currencies.
    label: "Price per m²",
    value: (p) => {
      const area = p.propertyType === "land" ? p.landAreaSqm : p.areaSqm;
      return area ? `${formatPrice(p.askingPrice / area, p.currency)} / m²` : null;
    },
  },
  { label: "Property type", value: (p) => TYPE_LABELS[p.propertyType] },
  { label: "Floor area", value: (p) => formatArea(p.areaSqm) },
  { label: "Land area", value: (p) => formatArea(p.landAreaSqm) },
  { label: "Bedrooms", value: (p) => (p.bedrooms === null ? null : String(p.bedrooms)) },
  { label: "Bathrooms", value: (p) => (p.bathrooms === null ? null : String(p.bathrooms)) },
  { label: "Neighborhood", value: (p) => p.neighborhood?.name ?? null },
  { label: "Construction status", value: (p) => (p.constructionStatus ? STATUS_LABELS[p.constructionStatus] : null) },
  { label: "Last checked", value: (p) => (p.lastCheckedAt ? formatDate(p.lastCheckedAt) : null) },
];

export default function SavedApp() {
  const { slugs, remove } = useSaved();
  const [compare, setCompare] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const results = useQueries({
    queries: slugs.map((slug) => ({
      queryKey: ["property", slug],
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchProperty(slug, signal),
      retry: (n: number, e: Error) => !(e instanceof ApiError && e.status === 404) && n < 1,
    })),
  });

  const entries: Entry[] = useMemo(
    () => slugs.map((slug, i) => {
      const r = results[i];
      if (!r || r.isPending) return { slug, state: "loading" as const };
      if (r.isError) return { slug, state: r.error instanceof ApiError && r.error.status === 404 ? ("unavailable" as const) : ("error" as const) };
      return { slug, state: "ok" as const, data: r.data };
    }),
    [slugs, results],
  );

  const toggleCompare = (slug: string) =>
    setCompare((c) => (c.includes(slug) ? c.filter((s) => s !== slug) : c.length >= MAX_COMPARE ? c : [...c, slug]));
  const compared = entries.filter((e) => e.state === "ok" && compare.includes(e.slug)).map((e) => e.data!) ;

  if (slugs.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-[1.75rem] font-semibold sm:text-[2rem]">Saved properties</h1>
        <StateMessage title="Nothing saved yet" action={<Link href="/explore" className="rounded-md bg-accent px-4 py-2 text-body font-medium text-accent-ink">Explore the map</Link>}>
          Use the bookmark on any property to keep it here. Saved properties live in this browser only.
        </StateMessage>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[1.75rem] font-semibold sm:text-[2rem]">Saved properties</h1>
          <p className="mt-1 text-body text-ink-2">Stored in this browser only — they won&apos;t appear on other devices. Select up to {MAX_COMPARE} to compare.</p>
        </div>
        <PrimaryButton disabled={compare.length < 2} onClick={() => setShowCompare(true)}>
          <GitCompare className="h-4 w-4" aria-hidden /> Compare ({compare.length})
        </PrimaryButton>
      </div>

      {showCompare && compared.length >= 2 && (
        <section aria-labelledby="cmp-h" className="mt-5 rounded-xl border border-line bg-surface">
          <div className="flex items-center justify-between border-b border-line p-3">
            <h2 id="cmp-h" className="font-semibold">Comparison</h2>
            <SecondaryButton onClick={() => setShowCompare(false)}>Close</SecondaryButton>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-body">
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="p-3 font-normal text-ink-3"><span className="sr-only">Field</span></th>
                  {compared.map((p) => (
                    <th key={p.slug} scope="col" className="p-3 align-top font-medium">
                      <Link className="text-accent hover:underline" href={`/properties/${p.slug}`}>{p.title}</Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => {
                  const values = compared.map((p) => r.value(p));
                  const differs = new Set(values.map((v) => v ?? "—")).size > 1;
                  return (
                    <tr key={r.label} className={`border-b border-line last:border-0 ${differs ? "bg-accent-soft/60" : ""}`}>
                      <th scope="row" className="p-3 text-left font-normal text-ink-2">{r.label}{differs && <span className="ml-1.5 rounded bg-accent-soft px-1.5 py-0.5 text-xs font-medium text-accent-hover">differs</span>}</th>
                      {compared.map((p, i) => (
                        <td key={p.slug} className={`p-3 tabular-nums ${values[i] === null ? "text-ink-3" : ""}`}>{values[i] ?? "Not stated"}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="p-3 text-xs text-ink-3">Prices are shown in their original currencies and are not converted, so compare prices (and price per m²) only when currencies match. Price per m² is the asking price divided by the stated area; it is left blank when no area is stated.</p>
        </section>
      )}

      <ul className="mt-5 grid gap-4 sm:grid-cols-2" aria-label="Saved properties">
        {entries.map((e) => (
          <li key={e.slug} data-testid="saved-item" className="overflow-hidden rounded-xl border border-line bg-surface">
            {e.state === "ok" && e.data ? (
              <>
                <PropertyImage src={e.data.images[0]?.url} alt={e.data.images[0]?.alt ?? ""} className="aspect-[3/2] w-full" />
                <div className="space-y-2 p-3">
                  <p className="text-[1.1875rem] font-semibold tabular-nums">{formatPrice(e.data.askingPrice, e.data.currency)}</p>
                  <p className="text-body">{e.data.title}</p>
                  <p className="text-body text-ink-2">{TYPE_LABELS[e.data.propertyType]} · {e.data.neighborhood?.name ?? "Baku"}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-body">
                    <Link href={`/properties/${e.slug}`} className="font-medium text-accent hover:text-accent-hover hover:underline">View details</Link>
                    <Link href={`/explore?sel=${encodeURIComponent(e.slug)}`} className="font-medium text-accent hover:text-accent-hover hover:underline">Show on map</Link>
                    <label className="flex items-center gap-1.5">
                      <input type="checkbox" checked={compare.includes(e.slug)} disabled={!compare.includes(e.slug) && compare.length >= MAX_COMPARE}
                        onChange={() => toggleCompare(e.slug)} />
                      Compare
                    </label>
                    <button type="button" onClick={() => { remove(e.slug); setCompare((c) => c.filter((s) => s !== e.slug)); }}
                      className="ml-auto inline-flex items-center gap-1 text-ink-2 hover:text-danger" aria-label={`Remove ${e.data.title} from saved`}>
                      <Trash2 className="h-4 w-4" aria-hidden /> Remove
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-4">
                <p className="flex items-center gap-2 font-medium"><Bookmark className="h-4 w-4 text-ink-3" aria-hidden />
                  {e.state === "loading" ? "Loading…" : e.state === "unavailable" ? "No longer available" : "Couldn't load this property"}
                </p>
                <p className="mt-1 text-sm text-ink-2">
                  {e.state === "unavailable" ? "This listing has been withdrawn or unpublished." : e.state === "error" ? "Please try again later." : "One moment."}
                </p>
                {e.state !== "loading" && (
                  <button type="button" onClick={() => remove(e.slug)} className="mt-3 inline-flex items-center gap-1 text-sm text-ink-2 hover:text-danger">
                    <Trash2 className="h-4 w-4" aria-hidden /> Remove from saved
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
