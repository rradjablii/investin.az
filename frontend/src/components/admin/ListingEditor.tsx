"use client";

/* eslint-disable @next/next/no-location-assign-relative-destination -- full page load on purpose so server components re-check the session cookie */

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin-api";
import { ApiError, fetchNeighborhoods } from "@/lib/api";
import { CONSTRUCTION_STATUSES, CURRENCIES, PROPERTY_TYPES } from "@/lib/filters";
import { formatDate } from "@/lib/format";
import type { AdminListing, DataSourceItem, ListingForm } from "@/lib/types";
import { StatusBadge } from "./common";
import { PrimaryButton, SecondaryButton, Spinner } from "@/components/ui/StateMessage";

const EMPTY: ListingForm = {
  title: "", description: "", askingPrice: null, currencyCode: "USD", constructionStatus: null, amenities: [], developerName: null,
  dataSourceId: null, externalReference: null, lastCheckedAt: null, sourceUpdatedAt: null, propertyType: "apartment",
  latitude: 40.4093, longitude: 49.8671, locationPrecision: "approximate", neighborhoodSlug: null, addressText: null,
  areaSqm: null, landAreaSqm: null, bedrooms: null, bathrooms: null,
};

const inp = "mt-1 h-10 w-full rounded-md border border-line-2 bg-surface px-3 text-sm font-normal";
const num = (v: string) => (v === "" ? null : Number(v));
const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");
const fromDateInput = (d: string) => (d ? `${d}T00:00:00Z` : null);

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <label className={`block text-sm font-medium ${wide ? "sm:col-span-2" : ""}`}>{label}{children}</label>;
}

export default function ListingEditor({ id }: { id?: string }) {
  const qc = useQueryClient();
  const sources = useQuery({ queryKey: ["admin", "sources"], queryFn: () => adminFetch<DataSourceItem[]>("/api/v1/admin/data-sources") });
  const hoods = useQuery({ queryKey: ["neighborhoods"], queryFn: fetchNeighborhoods });
  const listing = useQuery({ queryKey: ["admin", "listing", id], queryFn: () => adminFetch<AdminListing>(`/api/v1/admin/listings/${id}`), enabled: !!id });
  const [edits, setEdits] = useState<Partial<ListingForm>>({});
  const defaultSource = sources.data?.find((s) => !s.demonstration)?.id ?? sources.data?.[0]?.id ?? null;
  // Server data (or defaults for a new listing) overlaid with what the admin has typed so far.
  const form: ListingForm = { ...(listing.data?.form ?? { ...EMPTY, dataSourceId: defaultSource }), ...edits };
  const [problems, setProblems] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const set = <K extends keyof ListingForm>(k: K, v: ListingForm[K]) => setEdits((e) => ({ ...e, [k]: v }));
  const onError = (e: unknown) => {
    setNotice(null);
    setProblems(e instanceof ApiError ? [e.message, ...e.details] : ["Something went wrong"]);
  };
  const refresh = (l: AdminListing) => { qc.setQueryData(["admin", "listing", l.id], l); qc.invalidateQueries({ queryKey: ["admin", "listings"] }); qc.invalidateQueries({ queryKey: ["admin", "summary"] }); };

  const save = useMutation({
    mutationFn: () => id
      ? adminFetch<AdminListing>(`/api/v1/admin/listings/${id}`, { method: "PATCH", json: form })
      : adminFetch<AdminListing>("/api/v1/admin/listings", { method: "POST", json: form }),
    onSuccess: (l) => { setProblems([]); setEdits({}); refresh(l); if (!id) window.location.assign(`/admin/listings/${l.id}/edit`); else setNotice("Saved."); },
    onError,
  });
  const action = useMutation({
    mutationFn: (v: { path: string; json?: unknown }) => adminFetch<AdminListing>(`/api/v1/admin/listings/${id}/${v.path}`, { method: "POST", json: v.json }),
    onSuccess: (l) => { setProblems([]); setNotice("Updated."); refresh(l); },
    onError,
  });

  if (id && listing.isPending) return <Spinner label="Loading listing" />;
  if (id && listing.isError) return <p role="alert" className="text-danger">Couldn&apos;t load this listing.</p>;
  const l = listing.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">{id ? "Edit listing" : "New listing"}</h1>
        {l && <StatusBadge status={l.status} />}
        {l?.demonstration && <span className="rounded bg-warn-bg px-2 text-xs text-warn-ink">fictional demo data</span>}
        {l?.status === "published" && <Link className="ml-auto text-sm text-accent hover:underline" href={`/properties/${l.propertySlug}`}>View public page</Link>}
      </div>

      {(problems.length > 0 || notice) && (
        <div role={problems.length ? "alert" : "status"} className={`rounded-md p-3 text-sm ${problems.length ? "bg-danger-soft text-danger" : "bg-accent-soft text-accent"}`}>
          {problems.length ? <ul className="list-disc pl-4">{problems.map((p) => <li key={p}>{p}</li>)}</ul> : notice}
        </div>
      )}

      <form className="grid gap-4 rounded-lg border border-line bg-surface p-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <Field label="Title" wide><input required className={inp} value={form.title} onChange={(e) => set("title", e.target.value)} /></Field>
        <Field label="Description (min. 20 characters to publish)" wide>
          <textarea rows={4} className={`${inp} h-auto py-2`} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} /></Field>
        <Field label="Property type"><select className={inp} value={form.propertyType ?? ""} onChange={(e) => set("propertyType", e.target.value)}>{PROPERTY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></Field>
        <Field label="Construction status"><select className={inp} value={form.constructionStatus ?? ""} onChange={(e) => set("constructionStatus", e.target.value || null)}><option value="">Unknown</option>{CONSTRUCTION_STATUSES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></Field>
        <Field label="Asking price"><input type="number" min="0" step="0.01" required className={inp} value={form.askingPrice ?? ""} onChange={(e) => set("askingPrice", num(e.target.value))} /></Field>
        <Field label="Currency (original, never converted)"><select className={inp} value={form.currencyCode ?? ""} onChange={(e) => set("currencyCode", e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Floor area, m² (leave empty if unknown)"><input type="number" min="0" step="0.01" className={inp} value={form.areaSqm ?? ""} onChange={(e) => set("areaSqm", num(e.target.value))} /></Field>
        <Field label="Land / plot area, m²"><input type="number" min="0" step="0.01" className={inp} value={form.landAreaSqm ?? ""} onChange={(e) => set("landAreaSqm", num(e.target.value))} /></Field>
        <Field label="Bedrooms (empty = unknown)"><input type="number" min="0" className={inp} value={form.bedrooms ?? ""} onChange={(e) => set("bedrooms", num(e.target.value))} /></Field>
        <Field label="Bathrooms (empty = unknown)"><input type="number" min="0" className={inp} value={form.bathrooms ?? ""} onChange={(e) => set("bathrooms", num(e.target.value))} /></Field>
        <Field label="Latitude"><input type="number" step="any" required className={inp} value={form.latitude ?? ""} onChange={(e) => set("latitude", num(e.target.value))} /></Field>
        <Field label="Longitude"><input type="number" step="any" required className={inp} value={form.longitude ?? ""} onChange={(e) => set("longitude", num(e.target.value))} /></Field>
        <Field label="Location precision shown publicly"><select className={inp} value={form.locationPrecision ?? "approximate"} onChange={(e) => set("locationPrecision", e.target.value)}><option value="approximate">Approximate (rounded ~100 m)</option><option value="exact">Exact</option></select></Field>
        <Field label="Neighborhood"><select className={inp} value={form.neighborhoodSlug ?? ""} onChange={(e) => set("neighborhoodSlug", e.target.value || null)}><option value="">None</option>{hoods.data?.map((h) => <option key={h.slug} value={h.slug}>{h.name}</option>)}</select></Field>
        <Field label="Address / street (optional)" wide><input className={inp} value={form.addressText ?? ""} onChange={(e) => set("addressText", e.target.value || null)} /></Field>
        <Field label="Data source"><select required className={inp} value={form.dataSourceId ?? ""} onChange={(e) => set("dataSourceId", e.target.value)}>{sources.data?.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.permissionStatus})</option>)}</select></Field>
        <Field label="External reference (source's own ID)"><input className={inp} value={form.externalReference ?? ""} onChange={(e) => set("externalReference", e.target.value || null)} /></Field>
        <Field label="Last checked against source"><input type="date" className={inp} value={toDateInput(form.lastCheckedAt)} onChange={(e) => set("lastCheckedAt", fromDateInput(e.target.value))} /></Field>
        <Field label="Source last updated"><input type="date" className={inp} value={toDateInput(form.sourceUpdatedAt)} onChange={(e) => set("sourceUpdatedAt", fromDateInput(e.target.value))} /></Field>
        <Field label="Developer (optional)"><input className={inp} value={form.developerName ?? ""} onChange={(e) => set("developerName", e.target.value || null)} /></Field>
        <Field label="Amenities (comma separated)"><input className={inp} value={form.amenities.join(", ")} onChange={(e) => set("amenities", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} /></Field>
        <div className="sm:col-span-2"><PrimaryButton type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : id ? "Save changes" : "Create draft"}</PrimaryButton></div>
      </form>

      {l && (
        <>
          <section aria-labelledby="wf" className="rounded-lg border border-line bg-surface p-4">
            <h2 id="wf" className="text-lg font-semibold">Workflow</h2>
            <p className="text-sm text-ink-2">Draft → Review → Published. Publishing is re-validated on the server and requires administrator rights.</p>
            {l.reviewNote && <p className="mt-2 rounded bg-warn-bg p-2 text-sm text-warn-ink">Note: {l.reviewNote}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {["draft", "unpublished", "needs_review"].includes(l.status) && <SecondaryButton onClick={() => action.mutate({ path: "submit-review" })}>Submit for review</SecondaryButton>}
              {["review", "unpublished", "needs_review"].includes(l.status) && <PrimaryButton onClick={() => action.mutate({ path: "publish" })}>Publish</PrimaryButton>}
              {l.status === "published" && <SecondaryButton onClick={() => action.mutate({ path: "unpublish" })}>Unpublish</SecondaryButton>}
              {l.status === "published" && <SecondaryButton onClick={() => action.mutate({ path: "flag-stale", json: { note: "Flagged as possibly stale" } })}>Flag as stale</SecondaryButton>}
              {l.status !== "archived" && <SecondaryButton onClick={() => action.mutate({ path: "mark-checked" })}>Mark checked today</SecondaryButton>}
              {l.status !== "archived" ? <SecondaryButton onClick={() => action.mutate({ path: "archive" })}>Archive</SecondaryButton> : <SecondaryButton onClick={() => action.mutate({ path: "restore" })}>Restore to draft</SecondaryButton>}
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-medium">Verification steps (record only what actually happened)</h3>
              <ul className="mt-1 text-sm">
                {l.verifications.length === 0 && <li className="text-ink-3">None recorded.</li>}
                {l.verifications.map((v) => <li key={v.kind}>✓ {v.label} — {v.performedBy}, {formatDate(v.performedAt)}</li>)}
              </ul>
              <div className="mt-2 flex flex-wrap gap-2">
                {[["location_reviewed", "Location reviewed"], ["source_contacted", "Source contacted"], ["documents_reviewed", "Documents reviewed"]].map(([k, label]) => (
                  <SecondaryButton key={k} onClick={() => action.mutate({ path: "verifications", json: { kind: k } })}>Record: {label}</SecondaryButton>
                ))}
              </div>
            </div>
          </section>

          <MediaManager listing={l} onChange={refresh} onError={onError} />

          <section aria-labelledby="hist" className="rounded-lg border border-line bg-surface p-4 text-sm">
            <h2 id="hist" className="text-lg font-semibold">History</h2>
            <ul className="mt-2 space-y-1">
              {l.history.map((h, i) => <li key={i}>{formatDate(h.changedAt)} — {h.fromStatus ?? "new"} → <b>{h.toStatus}</b> by {h.changedBy}{h.note ? ` (${h.note})` : ""}</li>)}
            </ul>
            <h3 className="mt-4 text-sm font-medium">Audit log</h3>
            <ul className="mt-1 max-h-48 space-y-1 overflow-auto text-xs text-ink-2">
              {l.audit.map((a, i) => <li key={i}>{formatDate(a.createdAt)} · {a.actor} · {a.action}{a.details ? ` · ${a.details}` : ""}</li>)}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function MediaManager({ listing, onChange, onError }: { listing: AdminListing; onChange: (l: AdminListing) => void; onError: (e: unknown) => void }) {
  const [busy, setBusy] = useState(false);
  const upload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    try {
      const l = await adminFetch<AdminListing>(`/api/v1/admin/listings/${listing.id}/media`, { method: "POST", body: new FormData(form) });
      onChange(l);
      form.reset();
    } catch (err) { onError(err); } finally { setBusy(false); }
  };
  const patch = (mediaId: string, json: unknown) => adminFetch<AdminListing>(`/api/v1/admin/media/${mediaId}`, { method: "PATCH", json }).then(onChange).catch(onError);
  const remove = (mediaId: string) => adminFetch<AdminListing>(`/api/v1/admin/media/${mediaId}`, { method: "DELETE" }).then(onChange).catch(onError);
  return (
    <section aria-labelledby="media" className="rounded-lg border border-line bg-surface p-4">
      <h2 id="media" className="text-lg font-semibold">Photographs</h2>
      <p className="text-sm text-ink-2">JPEG, PNG or WebP up to 8 MB. Every image needs alt text and a rights reference (who owns it and the permission to use it).</p>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {listing.media.map((m) => (
          <li key={m.id} className="rounded-md border border-line p-2 text-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m.url.endsWith(".svg") ? m.url : `${m.url}?w=320`} alt={m.altText} className="h-32 w-full rounded object-cover" />
            <p className="mt-1">{m.altText}</p>
            <p className="text-xs text-ink-3">Rights: {m.rightsReference ?? "—"}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {m.primary ? <span className="rounded bg-accent-soft px-2 text-xs text-accent">Primary</span> : <button className="text-accent hover:underline" onClick={() => patch(m.id, { primary: true })}>Make primary</button>}
              <button className="text-danger hover:underline" onClick={() => remove(m.id)}>Delete</button>
            </div>
          </li>
        ))}
        {listing.media.length === 0 && <li className="text-sm text-ink-3">No images yet.</li>}
      </ul>
      <form onSubmit={upload} className="mt-4 grid gap-2 sm:grid-cols-2">
        <input type="file" name="file" accept="image/jpeg,image/png,image/webp" required aria-label="Image file" className="text-sm" />
        <input name="altText" required placeholder="Alt text (describe the photo)" aria-label="Alt text" className="h-9 rounded border border-line-2 px-2 text-sm" />
        <input name="rightsReference" required placeholder="Rights reference (owner / licence / permission ref.)" aria-label="Rights reference" className="h-9 rounded border border-line-2 px-2 text-sm sm:col-span-2" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="primary" value="true" /> Make primary</label>
        <SecondaryButton type="submit" disabled={busy}>{busy ? "Uploading…" : "Upload image"}</SecondaryButton>
      </form>
    </section>
  );
}
