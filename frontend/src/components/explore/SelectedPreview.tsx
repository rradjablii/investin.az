"use client";

import Link from "next/link";
import { X } from "lucide-react";
import PropertyImage from "@/components/ui/PropertyImage";
import SaveButton from "@/components/ui/SaveButton";
import { areaSummary, formatPrice, TYPE_LABELS } from "@/lib/format";
import type { PropertySummary } from "@/lib/types";

/** Compact preview of the selected marker. The price here is exact; markers abbreviate it. */
export default function SelectedPreview({ property: p, detailHref, onClose }: { property: PropertySummary; detailHref: string; onClose: () => void }) {
  return (
    <aside aria-label="Selected property" data-testid="selected-preview"
      className="pointer-events-auto flex w-full gap-3 rounded-xl border border-line bg-surface p-2.5 shadow-float">
      <PropertyImage src={p.primaryImage?.url} alt={p.primaryImage?.alt ?? ""} sizes="120px" className="h-[88px] w-[104px] shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1">
        <p className="text-[1.0625rem] font-semibold leading-snug tabular-nums">{formatPrice(p.askingPrice, p.currency)}</p>
        <p className="truncate text-body">{p.title}</p>
        <p className="truncate text-sm text-ink-2">
          {TYPE_LABELS[p.propertyType]} · {areaSummary(p)}{p.bedrooms !== null ? ` · ${p.bedrooms} bd` : ""} · {p.neighborhood?.name ?? "Baku"}
        </p>
        <Link href={detailHref} className="mt-1 inline-block text-body font-medium text-accent hover:text-accent-hover hover:underline">View details</Link>
      </div>
      <div className="flex flex-col items-end justify-between">
        <button type="button" onClick={onClose} aria-label="Close preview" className="rounded-md p-1 text-ink-3 hover:bg-hover"><X className="h-4 w-4" aria-hidden /></button>
        <SaveButton slug={p.slug} title={p.title} />
      </div>
    </aside>
  );
}
