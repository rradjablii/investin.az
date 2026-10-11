import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Map as MapIcon } from "lucide-react";
import NeighborhoodMap from "@/components/property/NeighborhoodMapLoader";
import PropertyImage from "@/components/ui/PropertyImage";
import { formatDate, formatPrice, TYPE_LABELS } from "@/lib/format";
import { getNeighborhood, getNeighborhoodProperties } from "@/lib/server-api";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const h = await getNeighborhood(slug).catch(() => null);
  return { title: h ? h.name : "Neighborhood not found" };
}

const CATEGORY_LABELS: Record<string, string> = {
  transport: "Transport", education: "Education", health: "Health", shopping: "Shopping", park: "Parks", culture: "Culture", other: "Other",
};
const card = "rounded-xl border border-line bg-surface p-5";

export default async function NeighborhoodPage({ params }: Props) {
  const { slug } = await params;
  const h = await getNeighborhood(slug);
  if (!h) notFound();
  const props = await getNeighborhoodProperties(slug, { size: 6 });
  const exploreHref = `/explore?neighborhood=${encodeURIComponent(h.slug)}`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <Link href="/neighborhoods" className="inline-flex items-center gap-1.5 text-body font-medium text-accent hover:text-accent-hover hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All neighborhoods
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[1.75rem] font-semibold sm:text-[2rem]">{h.name}</h1>
          <p className="mt-1 text-ink-2">{h.listingCount === 0 ? "No published listings right now" : `${h.listingCount} published ${h.listingCount === 1 ? "listing" : "listings"}`}</p>
        </div>
        <Link href={exploreHref} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-accent px-4 text-body font-medium text-accent-ink hover:bg-accent-hover">
          <MapIcon className="h-4 w-4" aria-hidden /> Explore {h.name} on the map
        </Link>
      </div>

      <div className="mt-5 h-80 overflow-hidden rounded-xl border border-line">
        <NeighborhoodMap centre={{ latitude: h.centerLatitude, longitude: h.centerLongitude }} boundaryGeoJson={h.boundaryGeoJson} name={h.name}
          points={props.map((p) => ({ slug: p.slug, latitude: p.latitude, longitude: p.longitude, label: formatPrice(p.askingPrice, p.currency) }))} />
      </div>
      <p className="mt-2 text-xs text-ink-3">
        {h.boundaryGeoJson ? "Shaded area: neighborhood boundary." : "No verified boundary is available for this neighborhood; the outlined dot marks an approximate centre point."} Green dots are published properties.
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section aria-labelledby="about-h" className={card}>
          <h2 id="about-h" className="text-xl font-semibold">About this area</h2>
          <p className="mt-2 text-ink-2">{h.description ?? "A sourced description of this neighborhood has not been written yet. We only publish descriptions that we can cite."}</p>
        </section>

        <section aria-labelledby="stats-h" className={card}>
          <h2 id="stats-h" className="text-xl font-semibold">Asking prices</h2>
          {h.askingPriceStats.length === 0 ? (
            <p className="mt-2 text-body text-ink-2">{h.statsNote}</p>
          ) : (
            <>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-left text-body">
                  <caption className="sr-only">Asking price statistics by currency</caption>
                  <thead className="border-b border-line text-sm text-ink-3">
                    <tr><th scope="col" className="py-2 pr-3 font-normal">Currency</th><th scope="col" className="py-2 pr-3 font-normal">Listings</th><th scope="col" className="py-2 pr-3 font-normal">Lowest</th><th scope="col" className="py-2 pr-3 font-normal">Median</th><th scope="col" className="py-2 font-normal">Highest</th></tr>
                  </thead>
                  <tbody>
                    {h.askingPriceStats.map((s) => (
                      <tr key={s.currency} className="border-b border-line last:border-0 tabular-nums">
                        <th scope="row" className="py-2 pr-3 font-medium">{s.currency}</th><td className="py-2 pr-3">{s.sampleSize}</td>
                        <td className="py-2 pr-3">{formatPrice(s.min, s.currency)}</td><td className="py-2 pr-3">{formatPrice(s.median, s.currency)}</td><td className="py-2">{formatPrice(s.max, s.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-ink-3">{h.statsNote}</p>
            </>
          )}
        </section>
      </div>

      <section className="mt-6" aria-labelledby="props-h">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="props-h" className="text-xl font-semibold">Available properties</h2>
          {props.length > 0 && <Link href={exploreHref} className="text-body font-medium text-accent hover:text-accent-hover hover:underline">See all on the map</Link>}
        </div>
        {props.length === 0 ? (
          <p className="mt-2 rounded-lg border border-line bg-surface p-4 text-body text-ink-2">There are no published properties in {h.name} at the moment.</p>
        ) : (
          <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {props.map((p) => (
              <li key={p.slug} className="overflow-hidden rounded-lg border border-line bg-surface hover:border-line-2">
                <Link href={`/properties/${p.slug}`} className="block">
                  <PropertyImage src={p.primaryImage?.url} alt={p.primaryImage?.alt ?? ""} sizes="320px" className="aspect-[3/2] w-full" />
                  <div className="p-3.5">
                    <p className="text-[1.0625rem] font-semibold tabular-nums">{formatPrice(p.askingPrice, p.currency)}</p>
                    <p className="line-clamp-1 text-body text-ink-2">{TYPE_LABELS[p.propertyType]} · {p.title}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={`${card} mt-6`} aria-labelledby="poi-h">
        <h2 id="poi-h" className="text-xl font-semibold">Nearby points of interest</h2>
        {h.nearbyPlaces.length === 0 ? (
          <p className="mt-2 text-body text-ink-2">No points of interest have been recorded within 3 km of this area&apos;s centre point.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {h.nearbyPlaces.map((p) => (
              <li key={p.name} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-body">
                <span className="font-medium">{p.name}</span>
                <span className="text-sm text-ink-3">{CATEGORY_LABELS[p.category] ?? p.category} · source: {p.sourceName}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 text-body text-ink-2" aria-labelledby="cov-h">
        <h2 id="cov-h" className="font-medium text-ink">Data coverage</h2>
        <p className="mt-1">Area: {h.boundarySource}. Neighborhood record updated {formatDate(h.dataUpdatedAt)}.</p>
      </section>
    </div>
  );
}
