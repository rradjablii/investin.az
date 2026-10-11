"use client";

import Link from "next/link";
import { forwardRef } from "react";
import { Bath, BedDouble, Check, FlaskConical, MapPin, Ruler } from "lucide-react";
import PropertyImage from "@/components/ui/PropertyImage";
import SaveButton from "@/components/ui/SaveButton";
import { areaSummary, formatPrice, STATUS_LABELS, TYPE_LABELS } from "@/lib/format";
import type { PropertySummary } from "@/lib/types";

interface Props {
  property: PropertySummary;
  selected: boolean;
  onSelect: (slug: string) => void;
  onHover?: (slug: string | null) => void;
  detailHref: string;
}

/**
 * Result card. The photo/price area is a button that selects the property (and so highlights its map marker);
 * "View details" and "Save" are separate controls so every action is keyboard reachable.
 */
const PropertyCard = forwardRef<HTMLLIElement, Props>(function PropertyCard({ property: p, selected, onSelect, onHover, detailHref }, ref) {
  const place = p.neighborhood?.name ?? p.addressText ?? "Baku";
  return (
    <li ref={ref} data-testid="property-card" data-slug={p.slug} data-selected={selected}
      onMouseEnter={() => onHover?.(p.slug)} onMouseLeave={() => onHover?.(null)}
      className={`overflow-hidden rounded-lg border bg-surface ${selected ? "border-accent ring-1 ring-accent" : "border-line hover:border-line-2"}`}>
      <div className="relative">
        <button type="button" onClick={() => onSelect(p.slug)} aria-pressed={selected}
          aria-label={`${selected ? "Selected: " : "Select "}${p.title}, ${formatPrice(p.askingPrice, p.currency)}`}
          className="block w-full text-left">
          <PropertyImage src={p.primaryImage?.url} alt={p.primaryImage?.alt ?? ""} className="aspect-[3/2] w-full" />
        </button>
        <div className="absolute right-2.5 top-2.5"><SaveButton slug={p.slug} title={p.title} /></div>
        <div className="pointer-events-none absolute bottom-2.5 left-2.5 flex flex-wrap gap-1.5">
          {selected && (
            <span className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-accent-ink">
              <Check className="h-3.5 w-3.5" aria-hidden /> Selected
            </span>
          )}
          {p.demonstration && (
            <span className="inline-flex items-center gap-1 rounded-md bg-warn-bg px-2 py-0.5 text-xs font-medium text-warn-ink">
              <FlaskConical className="h-3.5 w-3.5" aria-hidden /> Fictional demo
            </span>
          )}
        </div>
      </div>
      <div className="space-y-1 p-3.5">
        <div className="flex items-baseline justify-between gap-3">
          <p data-testid="card-price" className="text-[1.1875rem] font-semibold leading-tight tabular-nums">{formatPrice(p.askingPrice, p.currency)}</p>
          <span className="shrink-0 text-xs text-ink-3">{TYPE_LABELS[p.propertyType]}</span>
        </div>
        <p className="line-clamp-1 text-body text-ink">{p.title}</p>
        <p data-testid="card-location" className="flex items-center gap-1.5 text-body text-ink-2"><MapPin className="h-4 w-4 shrink-0 text-ink-3" aria-hidden /><span className="line-clamp-1">{place}</span></p>
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5 text-sm text-ink-2">
          <li className="flex items-center gap-1.5"><Ruler className="h-4 w-4 text-ink-3" aria-hidden /> {areaSummary(p)}</li>
          {p.bedrooms !== null && <li className="flex items-center gap-1.5"><BedDouble className="h-4 w-4 text-ink-3" aria-hidden /> {p.bedrooms} bd</li>}
          {p.bathrooms !== null && <li className="flex items-center gap-1.5"><Bath className="h-4 w-4 text-ink-3" aria-hidden /> {p.bathrooms} ba</li>}
          {p.constructionStatus && <li>{STATUS_LABELS[p.constructionStatus]}</li>}
        </ul>
        <div className="pt-1.5">
          <Link href={detailHref} className="text-body font-medium text-accent hover:text-accent-hover hover:underline">
            View details{" "}<span className="sr-only">for {p.title}</span>
          </Link>
        </div>
      </div>
    </li>
  );
});

export default PropertyCard;
