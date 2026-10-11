import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BedDouble, Bath, Building2, CalendarCheck, FlaskConical, Hammer, Ruler, ShieldCheck, Trees } from "lucide-react";
import Gallery from "@/components/property/Gallery";
import InquiryForm from "@/components/property/InquiryForm";
import LocationMap from "@/components/property/LocationMapLoader";
import SaveButton from "@/components/ui/SaveButton";
import { formatArea, formatDate, formatPrice, STATUS_LABELS, TYPE_LABELS } from "@/lib/format";
import { getProperty } from "@/lib/server-api";

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
      <dd className="mt-0.5 text-sm font-medium">{children}</dd>
    </div>
  );
}

export default async function PropertyPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { from } = await searchParams;
  const p = await getProperty(slug);
  if (!p) notFound();

  const approximate = p.locationPrecision === "approximate";
  return (
    <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
      <Link href={backHref(from, slug)} className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to the map
      </Link>

      {p.demonstration && (
        <p role="note" className="mt-3 flex items-center gap-2 rounded-md bg-warn-bg px-3 py-2 text-sm text-warn-ink">
          <FlaskConical className="h-4 w-4 shrink-0" aria-hidden />
          Fictional demonstration data. This is not a real property or advertisement.
        </p>
      )}

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <Gallery images={p.images} />

          <section>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{p.title}</h1>
                <p className="mt-1 text-ink-2">{[TYPE_LABELS[p.propertyType], p.neighborhood?.name, p.addressText].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-semibold tabular-nums">{formatPrice(p.askingPrice, p.currency)}</p>
                <p className="text-xs text-ink-3">Asking price in {p.currency}, as advertised</p>
              </div>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-4 rounded-lg border border-line bg-surface p-4 sm:grid-cols-3">
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
          </section>

          <section aria-labelledby="desc">
            <h2 id="desc" className="text-lg font-semibold">Description</h2>
            <p className="mt-2 whitespace-pre-line text-ink-2">{p.description ?? "No description has been provided."}</p>
            {p.amenities.length > 0 && (
              <>
                <h3 className="mt-4 text-sm font-medium">Amenities</h3>
                <ul className="mt-2 flex flex-wrap gap-2">{p.amenities.map((a) => <li key={a} className="rounded-full border border-line-2 px-3 py-1 text-sm">{a}</li>)}</ul>
              </>
            )}
          </section>

          <section aria-labelledby="loc">
            <h2 id="loc" className="text-lg font-semibold">Location</h2>
            <p className="mt-1 text-sm text-ink-2">
              {approximate ? "Approximate location (within roughly 100 m). The exact address is shared by the seller." : "Exact location."}
              {p.neighborhood && <> Neighborhood: <Link className="text-accent hover:underline" href={`/neighborhoods/${p.neighborhood.slug}`}>{p.neighborhood.name}</Link>.</>}
            </p>
            <div className="mt-3 h-72 overflow-hidden rounded-lg border border-line">
              <LocationMap latitude={p.latitude} longitude={p.longitude} approximate={approximate} />
            </div>
          </section>

          <section aria-labelledby="src" className="rounded-lg border border-line bg-surface p-4">
            <h2 id="src" className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck className="h-5 w-5 text-ink-3" aria-hidden /> Source and verification</h2>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-ink-3">Listing source</dt><dd className="font-medium">{p.source.name} <span className="font-normal text-ink-3">({p.source.sourceType.replace("_", " ")})</span></dd></div>
              <div><dt className="flex items-center gap-1 text-ink-3"><CalendarCheck className="h-3.5 w-3.5" aria-hidden /> Last checked</dt><dd className="font-medium">{formatDate(p.lastCheckedAt)}</dd></div>
              <div><dt className="text-ink-3">Published</dt><dd className="font-medium">{formatDate(p.publishedAt)}</dd></div>
              {p.sourceUpdatedAt && <div><dt className="text-ink-3">Source last updated</dt><dd className="font-medium">{formatDate(p.sourceUpdatedAt)}</dd></div>}
            </dl>
            <div className="mt-3 text-sm">
              <p className="text-ink-3">Verification steps recorded</p>
              {p.verifications.length > 0 ? (
                <ul className="mt-1 space-y-1">{p.verifications.map((v) => <li key={v.kind}>✓ <span className="font-medium">{v.label}</span> <span className="text-ink-3">· {formatDate(v.performedAt)}</span></li>)}</ul>
              ) : (
                <p className="mt-1 text-ink-2">None. This listing has been entered by our team but no independent verification step has been recorded.</p>
              )}
            </div>
            {p.source.attributionRequirements && <p className="mt-3 text-xs text-ink-3">{p.source.attributionRequirements}</p>}
          </section>

          {p.otherListings.length > 0 && (
            <section aria-labelledby="others">
              <h2 id="others" className="text-lg font-semibold">Also advertised by</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {p.otherListings.map((o) => <li key={o.listingId}>{o.sourceName}: <span className="font-medium">{formatPrice(o.askingPrice, o.currency)}</span> <span className="text-ink-3">· checked {formatDate(o.lastCheckedAt)}</span></li>)}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start" aria-label="Contact">
          <div className="flex gap-2"><SaveButton slug={p.slug} title={p.title} variant="full" /></div>
          <div className="rounded-lg border border-line bg-surface p-4">
            <h2 className="mb-3 text-base font-semibold">Contact the seller</h2>
            <InquiryForm listingId={p.listingId} title={p.title} />
          </div>
        </aside>
      </div>
    </div>
  );
}
