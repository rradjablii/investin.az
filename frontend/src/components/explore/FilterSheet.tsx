"use client";

import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  CONSTRUCTION_STATUSES, CURRENCIES, EMPTY_FILTERS, FRESHNESS_OPTIONS, PROPERTY_TYPES,
  hasErrors, validateFilters, type Filters,
} from "@/lib/filters";
import type { NeighborhoodSummary } from "@/lib/types";
import { PrimaryButton, SecondaryButton } from "@/components/ui/StateMessage";

interface Props {
  filters: Filters;
  neighborhoods: NeighborhoodSummary[];
  onApply: (f: Filters) => void;
  onClose: () => void;
}

const BEDROOM_OPTIONS = [1, 2, 3, 4, 5, 6];

function NumberField({ label, value, onChange, step = 1, placeholder }: {
  label: string; value: number | null; onChange: (n: number | null) => void; step?: number; placeholder?: string;
}) {
  return (
    <label className="block text-body">
      <span className="mb-1 block text-ink-2">{label}</span>
      <input type="number" inputMode="decimal" min={0} step={step} value={value ?? ""} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className="h-10 w-full rounded-md border border-line-2 bg-surface px-3 text-body" />
    </label>
  );
}

function BedroomSelect({ label, value, onChange }: { label: string; value: number | null; onChange: (n: number | null) => void }) {
  return (
    <label className="block text-body">
      <span className="mb-1 block text-ink-2">{label}</span>
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className="h-10 w-full rounded-md border border-line-2 bg-surface px-2">
        <option value="">Any</option>
        {BEDROOM_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
    </label>
  );
}

/** Modal filter editor. Edits are pending until Apply, so the map and list never flicker half-way. */
export default function FilterSheet({ filters, neighborhoods, onApply, onClose }: Props) {
  const [draft, setDraft] = useState<Filters>(filters);
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const errors = validateFilters(draft);
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const toggle = <T extends string>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>("button, input, select")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panelRef.current) {
        const f = Array.from(panelRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), input, select, a[href]"));
        if (f.length === 0) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); previous?.focus(); };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId}
        className="flex max-h-[92dvh] w-full flex-col rounded-t-2xl border border-line bg-surface shadow-float sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 id={titleId} className="text-base font-semibold">Filters</h2>
          <button type="button" onClick={onClose} aria-label="Close filters" className="rounded p-1 text-ink-2 hover:bg-bg">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto px-4 py-4">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Property type</legend>
            <div className="flex flex-wrap gap-2">
              {PROPERTY_TYPES.map((t) => (
                <label key={t.value} className={`cursor-pointer rounded-md border px-3.5 py-2 text-body ${draft.type.includes(t.value) ? "border-accent bg-accent-soft font-medium text-accent-hover" : "border-line-2"}`}>
                  <input type="checkbox" className="sr-only" checked={draft.type.includes(t.value)}
                    onChange={() => set("type", toggle(draft.type, t.value))} />
                  {draft.type.includes(t.value) ? "✓ " : ""}{t.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">Asking price</legend>
            <p className="mb-2 text-xs text-ink-3">Prices are shown and filtered in the currency each listing was advertised in. They are never converted.</p>
            <div className="grid grid-cols-3 gap-3">
              <label className="block text-body">
                <span className="mb-1 block text-ink-2">Currency</span>
                <select value={draft.currency ?? ""} onChange={(e) => {
                  const c = (e.target.value || null) as Filters["currency"];
                  setDraft((d) => ({ ...d, currency: c, ...(c ? {} : { minPrice: null, maxPrice: null, sort: d.sort.startsWith("price") ? "newest" : d.sort }) }));
                }} className="h-10 w-full rounded-md border border-line-2 bg-surface px-2">
                  <option value="">Any</option>
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <NumberField label="Min" value={draft.minPrice} onChange={(n) => set("minPrice", n)} />
              <NumberField label="Max" value={draft.maxPrice} onChange={(n) => set("maxPrice", n)} />
            </div>
            {errors.currency && <p role="alert" className="mt-1 text-body text-danger">{errors.currency}</p>}
            {errors.price && <p role="alert" className="mt-1 text-body text-danger">{errors.price}</p>}
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">Bedrooms</legend>
            <div className="grid grid-cols-2 gap-3">
              <BedroomSelect label="Min" value={draft.minBedrooms} onChange={(n) => set("minBedrooms", n)} />
              <BedroomSelect label="Max" value={draft.maxBedrooms} onChange={(n) => set("maxBedrooms", n)} />
            </div>
            <p className="mt-1 text-xs text-ink-3">Properties with an unknown bedroom count are excluded when this filter is used.</p>
            {errors.bedrooms && <p role="alert" className="mt-1 text-body text-danger">{errors.bedrooms}</p>}
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">Area (m²)</legend>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Min" value={draft.minArea} onChange={(n) => set("minArea", n)} />
              <NumberField label="Max" value={draft.maxArea} onChange={(n) => set("maxArea", n)} />
            </div>
            {errors.area && <p role="alert" className="mt-1 text-body text-danger">{errors.area}</p>}
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">Construction status</legend>
            <div className="flex flex-wrap gap-2">
              {CONSTRUCTION_STATUSES.map((s) => (
                <label key={s.value} className={`cursor-pointer rounded-md border px-3.5 py-2 text-body ${draft.constructionStatus.includes(s.value) ? "border-accent bg-accent-soft font-medium text-accent-hover" : "border-line-2"}`}>
                  <input type="checkbox" className="sr-only" checked={draft.constructionStatus.includes(s.value)}
                    onChange={() => set("constructionStatus", toggle(draft.constructionStatus, s.value))} />
                  {draft.constructionStatus.includes(s.value) ? "✓ " : ""}{s.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-body">
              <span className="mb-1 block font-medium">Neighborhood</span>
              <select value={draft.neighborhood ?? ""} onChange={(e) => set("neighborhood", e.target.value || null)}
                className="h-10 w-full rounded-md border border-line-2 bg-surface px-2">
                <option value="">Anywhere in view</option>
                {neighborhoods.map((n) => <option key={n.slug} value={n.slug}>{n.name} ({n.listingCount})</option>)}
              </select>
            </label>
            <label className="block text-body">
              <span className="mb-1 block font-medium">Freshness</span>
              <select value={draft.freshnessDays ?? ""} onChange={(e) => set("freshnessDays", e.target.value ? Number(e.target.value) : null)}
                className="h-10 w-full rounded-md border border-line-2 bg-surface px-2">
                <option value="">Any</option>
                {FRESHNESS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 pb-safe">
          <SecondaryButton type="button" onClick={() => setDraft({ ...EMPTY_FILTERS })}>Reset all</SecondaryButton>
          <PrimaryButton type="button" disabled={hasErrors(errors)} onClick={() => onApply(draft)}>Apply filters</PrimaryButton>
        </div>
      </div>
    </div>
  );
}
