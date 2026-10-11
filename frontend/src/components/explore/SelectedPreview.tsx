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
      className="pointer-events-auto flex w-full gap-3 rounded-lg border border-line bg-surface p-2 shadow-lg">
      <PropertyImage src={p.primaryImage?.url} alt={p.primaryImage?.alt ?? ""} sizes="120px" className="h-24 w-28 shrink-0 rounded-md" />
      <div className="min-w-0 flex-1 py-0.5">
        <p className="text-base font-semibold tabular-nums">{formatPrice(p.askingPrice, p.currency)}</p>
        <p className="truncate text-sm">{p.title}</p>
        <p className="truncate text-xs text-ink-2">
          {TYPE_LABELS[p.propertyType]} · {areaSummary(p)}{p.bedrooms !== null ? ` · ${p.bedrooms} bd` : ""} · {p.neighborhood?.name ?? "Baku"}
        </p>
        <div className="mt-1.5 flex items-center gap-3">
          <Link href={detailHref} className="text-sm font-medium text-accent hover:underline">View details</Link>
        </div>
      </div>
      <div className="flex flex-col items-end justify-between">
        <button type="button" onClick={onClose} aria-label="Close preview" className="rounded p-1 text-ink-3 hover:bg-bg"><X className="h-4 w-4" aria-hidden /></button>
        <SaveButton slug={p.slug} title={p.title} />
      </div>
    </aside>
  );
}
