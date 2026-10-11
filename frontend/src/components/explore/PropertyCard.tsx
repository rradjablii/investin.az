"use client";

import Link from "next/link";
import { forwardRef } from "react";
import { BedDouble, Bath, CheckCircle2, Ruler, MapPin, FlaskConical } from "lucide-react";
import PropertyImage from "@/components/ui/PropertyImage";
import SaveButton from "@/components/ui/SaveButton";
import { areaSummary, formatPrice, STATUS_LABELS, TYPE_LABELS } from "@/lib/format";
import type { PropertySummary } from "@/lib/types";

interface Props {
  property: PropertySummary;
  selected: boolean;
  onSelect: (slug: string) => void;
  detailHref: string;
  compact?: boolean;
}

/**
 * Result card. The photo/price area is a button that selects the property (and so highlights its map marker);
 * "Details" and "Save" are separate controls so every action is keyboard reachable.
 */
const PropertyCard = forwardRef<HTMLLIElement, Props>(function PropertyCard({ property: p, selected, onSelect, detailHref }, ref) {
  const place = p.neighborhood?.name ?? p.addressText ?? "Baku";
  return (
    <li ref={ref} data-testid="property-card" data-slug={p.slug} data-selected={selected}
      className={`overflow-hidden rounded-lg border bg-surface ${selected ? "border-accent ring-2 ring-accent" : "border-line"}`}>
      <div className="relative">
        <button type="button" onClick={() => onSelect(p.slug)} aria-pressed={selected}
          aria-label={`${selected ? "Selected: " : "Select "}${p.title}, ${formatPrice(p.askingPrice, p.currency)}`}
          className="block w-full text-left">
          <PropertyImage src={p.primaryImage?.url} alt={p.primaryImage?.alt ?? ""} className="aspect-[16/10] w-full" />
        </button>
        <div className="absolute right-2 top-2"><SaveButton slug={p.slug} title={p.title} /></div>
        {selected && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-ink">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Selected
          </span>
        )}
        {p.demonstration && (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded bg-warn-bg px-1.5 py-0.5 text-[11px] font-medium text-warn-ink">
            <FlaskConical className="h-3 w-3" aria-hidden /> Fictional demo
          </span>
        )}
      </div>
      <div className="space-y-1.5 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-lg font-semibold tabular-nums">{formatPrice(p.askingPrice, p.currency)}</p>
          <span className="shrink-0 text-xs text-ink-3">{TYPE_LABELS[p.propertyType]}</span>
        </div>
        <p className="line-clamp-1 text-sm text-ink">{p.title}</p>
        <p className="flex items-center gap-1 text-sm text-ink-2"><MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden /> <span className="line-clamp-1">{place}</span></p>
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-2">
          <li className="flex items-center gap-1"><Ruler className="h-3.5 w-3.5" aria-hidden /> {areaSummary(p)}</li>
          {p.bedrooms !== null && <li className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" aria-hidden /> {p.bedrooms} bd</li>}
          {p.bathrooms !== null && <li className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" aria-hidden /> {p.bathrooms} ba</li>}
          {p.constructionStatus && <li>{STATUS_LABELS[p.constructionStatus]}</li>}
        </ul>
        <div className="pt-1">
          <Link href={detailHref} className="text-sm font-medium text-accent underline-offset-2 hover:underline">
            View details{" "}<span className="sr-only">for {p.title}</span>
          </Link>
        </div>
      </div>
    </li>
  );
});

export default PropertyCard;
