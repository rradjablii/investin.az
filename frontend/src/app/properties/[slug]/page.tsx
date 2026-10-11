import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bath, BedDouble, Building2, CalendarCheck, FlaskConical, Hammer, Ruler, ShieldCheck, Trees } from "lucide-react";
import Gallery from "@/components/property/Gallery";
import InquiryForm from "@/components/property/InquiryForm";
import LocationMap from "@/components/property/LocationMapLoader";
import PropertyImage from "@/components/ui/PropertyImage";
import SaveButton from "@/components/ui/SaveButton";
import { formatArea, formatDate, formatPrice, STATUS_LABELS, TYPE_LABELS } from "@/lib/format";
import { getNeighborhood, getNeighborhoodProperties, getProperty } from "@/lib/server-api";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ from?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProperty(slug).catch(() => null);
  if (!p) return { title: "Property unavailable" };
  return { title: p.title, description: `${TYPE_LABELS[p.propertyType]} · ${formatPrice(p.askingPrice, p.currency)} · ${p.neighborhood?.name ?? "Baku"}` };
}

/** `from` is only ever appended to /explore?, so it cannot redirect off-site; strip anything that is not a query string. */
function backHref(from: string | undefined, slug: string) {
  const safe = from && /^[\w%=&.,~+\-:]*$/.test(from) ? from : "";
  return `/explore?${safe || `sel=${encodeURIComponent(slug)}`}`;
}

function Fact({ icon: Icon, label, children }: { icon: React.ComponentType<{ className?: string }>; label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs text-ink-3"><Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />{label}</dt>
      <dd className="mt-0.5 text-body font-medium">{children}</dd>
    </div>
  );
}

const card = "rounded-xl border border-line bg-surface p-5";

export default async function PropertyPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { from } = await searchParams;
  const p = await getProperty(slug);
  if (!p) notFound();

  // Context from real stored data only: the neighborhood record, nearby places, and other published properties there.
  const [hood, nearby] = p.neighborhood
    ? await Promise.all([getNeighborhood(p.neighborhood.slug).catch(() => null), getNeighborhoodProperties(p.neighborhood.slug, { type: p.propertyType, size: 5 })])
    : [null, []];
  const related = nearby.filter((r) => r.slug !== p.slug).slice(0, 4);
  const approximate = p.locationPrecision === "approximate";

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:pb-10">
      <Link href={backHref(from, slug)} className="inline-flex items-center gap-1.5 text-body font-medium text-accent hover:text-accent-hover hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to the map
      </Link>

      {p.demonstration && (
        <p role="note" className="mt-3 flex items-center gap-2 rounded-lg bg-warn-bg px-3.5 py-2.5 text-body text-warn-ink">
          <FlaskConical className="h-4 w-4 shrink-0" aria-hidden />
          Fictional demonstration data. This is not a real property or advertisement.
        </p>
      )}

      <header className="mt-5 flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <h1 className="text-[1.75rem] font-semibold leading-tight sm:text-[2rem]">{p.title}</h1>
          <p className="mt-1 text-body text-ink-2">{[TYPE_LABELS[p.propertyType], p.neighborhood?.name, p.addressText].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="sm:text-right">
          <p className="text-[1.75rem] font-semibold leading-tight tabular-nums">{formatPrice(p.askingPrice, p.currency)}</p>
          <p className="text-sm text-ink-3">Asking price in {p.currency}, as advertised</p>
        </div>
      </header>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <Gallery images={p.images} />

          <dl className={`${card} grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3`}>
            {p.propertyType !== "land" && <Fact icon={Ruler} label="Internal floor area">{formatArea(p.areaSqm) ?? "Not stated"}</Fact>}
            {(p.propertyType === "land" || p.landAreaSqm !== null) && <Fact icon={Trees} label="Land (plot) area">{formatArea(p.landAreaSqm) ?? "Not stated"}</Fact>}
            {p.propertyType !== "land" && p.propertyType !== "commercial" && (
              <>
                <Fact icon={BedDouble} label="Bedrooms">{p.bedrooms ?? "Not stated"}</Fact>
                <Fact icon={Bath} label="Bathrooms">{p.bathrooms ?? "Not stated"}</Fact>
              </>
            )}
            <Fact icon={Hammer} label="Construction status">{p.constructionStatus ? STATUS_LABELS[p.constructionStatus] : "Not stated"}</Fact>
            <Fact icon={Building2} label="Developer">{p.developerName ?? "Not stated"}</Fact>
          </dl>

          <section aria-labelledby="desc" className={card}>
            <h2 id="desc" className="text-xl font-semibold">Description</h2>
            <p className="mt-2 max-w-prose whitespace-pre-line text-ink-2">{p.description ?? "No description has been provided."}</p>
            {p.amenities.length > 0 && (
              <>
                <h3 className="mt-5 text-body font-medium">Amenities</h3>
                <ul className="mt-2 flex flex-wrap gap-2">{p.amenities.map((a) => <li key={a} className="rounded-md bg-surface-2 px-3 py-1 text-sm text-ink-2">{a}</li>)}</ul>
              </>
            )}
          </section>

          <section aria-labelledby="loc" className={card}>
            <h2 id="loc" className="text-xl font-semibold">Location</h2>
            <p className="mt-1 text-body text-ink-2">
              {approximate ? "Approximate location (within roughly 100 m). The exact address is shared by the seller." : "Exact location."}
              {p.neighborhood && <> Neighborhood: <Link className="font-medium text-accent hover:underline" href={`/neighborhoods/${p.neighborhood.slug}`}>{p.neighborhood.name}</Link>.</>}
            </p>
            <div className="mt-3 h-72 overflow-hidden rounded-lg border border-line">
              <LocationMap latitude={p.latitude} longitude={p.longitude} approximate={approximate} />
            </div>
            {hood && hood.nearbyPlaces.length > 0 && (
              <div className="mt-4">
                <h3 className="text-body font-medium">Nearby places in {hood.name}</h3>
                <ul className="mt-2 divide-y divide-line text-body">
                  {hood.nearbyPlaces.slice(0, 6).map((pl) => (
                    <li key={pl.name} className="flex flex-wrap items-center justify-between gap-2 py-2"><span>{pl.name}</span><span className="text-sm text-ink-3">{pl.category} · source: {pl.sourceName}</span></li>
                  ))}
                </ul>
                <p className="mt-1 text-xs text-ink-3">Places are around the neighborhood centre, not measured from this property.</p>
              </div>
            )}
          </section>

          <section aria-labelledby="src" className={card}>
            <h2 id="src" className="flex items-center gap-2 text-xl font-semibold"><ShieldCheck className="h-5 w-5 text-ink-3" aria-hidden /> Source and verification</h2>
            <dl className="mt-3 grid gap-4 text-body sm:grid-cols-2">
              <div><dt className="text-sm text-ink-3">Listing source</dt><dd className="font-medium">{p.source.name} <span className="font-normal text-ink-3">({p.source.sourceType.replace("_", " ")})</span></dd></div>
              <div><dt className="flex items-center gap-1 text-sm text-ink-3"><CalendarCheck className="h-3.5 w-3.5" aria-hidden /> Last checked</dt><dd className="font-medium">{formatDate(p.lastCheckedAt)}</dd></div>
              <div><dt className="text-sm text-ink-3">Published</dt><dd className="font-medium">{formatDate(p.publishedAt)}</dd></div>
              {p.sourceUpdatedAt && <div><dt className="text-sm text-ink-3">Source last updated</dt><dd className="font-medium">{formatDate(p.sourceUpdatedAt)}</dd></div>}
            </dl>
            <div className="mt-4 text-body">
              <p className="text-sm text-ink-3">Verification steps recorded</p>
              {p.verifications.length > 0 ? (
                <ul className="mt-1 space-y-1">{p.verifications.map((v) => <li key={v.kind}>✓ <span className="font-medium">{v.label}</span> <span className="text-ink-3">· {formatDate(v.performedAt)}</span></li>)}</ul>
              ) : (
                <p className="mt-1 text-ink-2">None. This listing has been entered by our team but no independent verification step has been recorded.</p>
              )}
            </div>
            {p.source.attributionRequirements && <p className="mt-3 text-xs text-ink-3">{p.source.attributionRequirements}</p>}
          </section>

          {p.otherListings.length > 0 && (
            <section aria-labelledby="others" className={card}>
              <h2 id="others" className="text-xl font-semibold">Also advertised by</h2>
              <ul className="mt-2 space-y-1 text-body">
                {p.otherListings.map((o) => <li key={o.listingId}>{o.sourceName}: <span className="font-medium">{formatPrice(o.askingPrice, o.currency)}</span> <span className="text-ink-3">· checked {formatDate(o.lastCheckedAt)}</span></li>)}
              </ul>
            </section>
          )}

          {related.length > 0 && p.neighborhood && (
            <section aria-labelledby="related">
              <h2 id="related" className="text-xl font-semibold">More {TYPE_LABELS[p.propertyType].toLowerCase()} listings in {p.neighborhood.name}</h2>
              <ul className="mt-3 grid gap-4 sm:grid-cols-2">
                {related.map((r) => (
                  <li key={r.slug} className="overflow-hidden rounded-lg border border-line bg-surface hover:border-line-2">
                    <Link href={`/properties/${r.slug}`} className="block">
                      <PropertyImage src={r.primaryImage?.url} alt={r.primaryImage?.alt ?? ""} sizes="320px" className="aspect-[3/2] w-full" />
                      <div className="p-3.5">
                        <p className="text-[1.0625rem] font-semibold tabular-nums">{formatPrice(r.askingPrice, r.currency)}</p>
                        <p className="line-clamp-1 text-body text-ink-2">{r.title}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside id="contact" className="space-y-4 lg:sticky lg:top-4 lg:self-start" aria-label="Contact">
          <div className="hidden lg:block"><SaveButton slug={p.slug} title={p.title} variant="full" /></div>
          <div className={card}>
            <h2 className="mb-3 text-lg font-semibold">Contact the seller</h2>
            <InquiryForm listingId={p.listingId} title={p.title} />
          </div>
        </aside>
      </div>

      {/* Compact sticky action bar on small screens; the page has bottom padding so nothing is covered. */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-line bg-surface px-4 pb-safe pt-3 lg:hidden">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[1.0625rem] font-semibold tabular-nums">{formatPrice(p.askingPrice, p.currency)}</p>
          <p className="truncate text-xs text-ink-3">{p.neighborhood?.name ?? "Baku"}</p>
        </div>
        <SaveButton slug={p.slug} title={p.title} variant="full" />
        <a href="#contact" className="inline-flex min-h-10 items-center rounded-md bg-accent px-4 text-body font-medium text-accent-ink hover:bg-accent-hover">Contact</a>
      </div>
    </div>
  );
}
