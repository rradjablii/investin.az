import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Map as MapIcon } from "lucide-react";
import { formatDate, formatPrice } from "@/lib/format";
import { getNeighborhood } from "@/lib/server-api";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const h = await getNeighborhood(slug).catch(() => null);
  return { title: h ? h.name : "Neighborhood not found" };
}

const CATEGORY_LABELS: Record<string, string> = {
  transport: "Transport", education: "Education", health: "Health", shopping: "Shopping", park: "Parks", culture: "Culture", other: "Other",
};

export default async function NeighborhoodPage({ params }: Props) {
  const { slug } = await params;
  const h = await getNeighborhood(slug);
  if (!h) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <Link href="/neighborhoods" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All neighborhoods
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{h.name}</h1>
          <p className="mt-1 text-ink-2">{h.listingCount === 0 ? "No published listings right now" : `${h.listingCount} published ${h.listingCount === 1 ? "listing" : "listings"}`}</p>
        </div>
        <Link href={`/explore?neighborhood=${encodeURIComponent(h.slug)}`}
          className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent/90">
          <MapIcon className="h-4 w-4" aria-hidden /> Explore {h.name} on the map
        </Link>
      </div>

      <section className="mt-6" aria-labelledby="about-h">
        <h2 id="about-h" className="text-lg font-semibold">About this area</h2>
        <p className="mt-2 text-ink-2">
          {h.description ?? "A sourced description of this neighborhood has not been written yet. We only publish descriptions that we can cite."}
        </p>
      </section>

      <section className="mt-6" aria-labelledby="stats-h">
        <h2 id="stats-h" className="text-lg font-semibold">Asking prices</h2>
        {h.askingPriceStats.length === 0 ? (
          <p className="mt-2 rounded-md border border-line bg-surface p-3 text-sm text-ink-2">{h.statsNote}</p>
        ) : (
          <>
            <div className="mt-2 overflow-x-auto rounded-lg border border-line bg-surface">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Asking price statistics by currency</caption>
                <thead className="border-b border-line text-ink-3">
                  <tr><th scope="col" className="p-3 font-normal">Currency</th><th scope="col" className="p-3 font-normal">Listings</th><th scope="col" className="p-3 font-normal">Lowest</th><th scope="col" className="p-3 font-normal">Median</th><th scope="col" className="p-3 font-normal">Highest</th></tr>
                </thead>
                <tbody>
                  {h.askingPriceStats.map((s) => (
                    <tr key={s.currency} className="border-b border-line last:border-0 tabular-nums">
                      <th scope="row" className="p-3 font-medium">{s.currency}</th><td className="p-3">{s.sampleSize}</td>
                      <td className="p-3">{formatPrice(s.min, s.currency)}</td><td className="p-3">{formatPrice(s.median, s.currency)}</td><td className="p-3">{formatPrice(s.max, s.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-ink-3">{h.statsNote}</p>
          </>
        )}
      </section>

      <section className="mt-6" aria-labelledby="poi-h">
        <h2 id="poi-h" className="text-lg font-semibold">Nearby points of interest</h2>
        {h.nearbyPlaces.length === 0 ? (
          <p className="mt-2 text-sm text-ink-2">No points of interest have been recorded within 3 km of this area&apos;s centre point.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line rounded-lg border border-line bg-surface">
            {h.nearbyPlaces.map((p) => (
              <li key={p.name} className="flex items-center justify-between gap-3 p-3 text-sm">
                <span className="font-medium">{p.name}</span>
                <span className="text-ink-3">{CATEGORY_LABELS[p.category] ?? p.category} · source: {p.sourceName}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 rounded-lg border border-line bg-surface p-4 text-sm text-ink-2" aria-labelledby="cov-h">
        <h2 id="cov-h" className="font-medium text-ink">Data coverage</h2>
        <p className="mt-1">Area: {h.boundarySource}. Neighborhood record updated {formatDate(h.dataUpdatedAt)}.</p>
      </section>
    </div>
  );
}
