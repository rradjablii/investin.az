"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { List, LocateFixed, Map as MapIcon, PanelRightClose, PanelRightOpen, SlidersHorizontal, TriangleAlert, X } from "lucide-react";
import MapViewLoader from "./MapViewLoader";
import type { MapCommand } from "./mapTypes";
import ResultsPanel from "./ResultsPanel";
import SearchBox from "./SearchBox";
import FilterSheet from "./FilterSheet";
import SelectedPreview from "./SelectedPreview";
import { fetchMarkers, fetchNeighborhoods, fetchProperties, fetchProperty } from "@/lib/api";
import { DEFAULT_VIEW } from "@/lib/config";
import {
  activeChips, boundsKey, clampBounds, filterCount, filtersToParams, parseFilters, parseView, removeChip, viewToParams,
  EMPTY_FILTERS, type Bounds, type Filters, type ViewState,
} from "@/lib/filters";
import { updateUrl, useUrlParams } from "@/lib/useUrlState";
import type { PropertyDetail, PropertySummary, Suggestion } from "@/lib/types";

const FILTER_KEYS = ["type", "currency", "minPrice", "maxPrice", "minBedrooms", "maxBedrooms", "minArea", "maxArea",
  "constructionStatus", "neighborhood", "freshnessDays", "sort"];

function detailToSummary(d: PropertyDetail): PropertySummary {
  return { ...d, primaryImage: d.images[0] ?? null } as PropertySummary;
}

function sameView(a: ViewState, b: ViewState) {
  return Math.abs(a.lat - b.lat) < 0.0006 && Math.abs(a.lng - b.lng) < 0.0006 && Math.abs(a.zoom - b.zoom) < 0.06;
}

export default function ExploreApp() {
  const params = useUrlParams();
  const filters = useMemo(() => parseFilters(params), [params]);
  const urlView = useMemo(() => parseView(params), [params]);
  const selectedSlug = params.get("sel");
  const listView = params.get("v") === "list";

  const liveView = useRef<ViewState | null>(null);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [mapFailure, setMapFailure] = useState<string | null>(null);
  const [tileNotice, setTileNotice] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [command, setCommand] = useState<MapCommand | null>(null);
  const commandId = useRef(0);
  const moveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const issue = useCallback((c: Omit<MapCommand, "id">) => {
    commandId.current += 1;
    setCommand({ ...c, id: commandId.current });
  }, []);

  // ---- map -> app ----
  const onViewChange = useCallback((view: ViewState, b: Bounds) => {
    liveView.current = view;
    if (moveTimer.current) clearTimeout(moveTimer.current);
    // Debounce: one request per settled movement, not one per event.
    moveTimer.current = setTimeout(() => {
      setBounds(clampBounds(b));
      updateUrl((p) => viewToParams(view, p), "replace");
    }, 350);
  }, []);
  useEffect(() => () => { if (moveTimer.current) clearTimeout(moveTimer.current); }, []);

  // ---- URL -> map (browser back/forward, shared links) ----
  useEffect(() => {
    if (urlView && liveView.current && !sameView(urlView, liveView.current)) {
      issue({ kind: "jump", view: urlView });
    }
  }, [urlView, issue]);

  const mapFailed = mapFailure !== null;
  const effBounds = filters.neighborhood || mapFailed ? null : bounds;
  const queriesEnabled = mapFailed || bounds !== null || filters.neighborhood !== null;
  const filterKey = filtersToParams(filters).toString();

  const markersQ = useQuery({
    queryKey: ["markers", filterKey, boundsKey(effBounds)],
    queryFn: ({ signal }) => fetchMarkers(filters, effBounds, signal),
    enabled: queriesEnabled,
    placeholderData: keepPreviousData,
  });
  const listQ = useInfiniteQuery({
    queryKey: ["list", filterKey, boundsKey(effBounds)],
    queryFn: ({ pageParam, signal }) => fetchProperties(filters, effBounds, pageParam, signal),
    initialPageParam: 0,
    getNextPageParam: (last) => ((last.page + 1) * last.size < last.total ? last.page + 1 : undefined),
    enabled: queriesEnabled,
    placeholderData: keepPreviousData,
  });
  const hoodsQ = useQuery({ queryKey: ["neighborhoods"], queryFn: fetchNeighborhoods, staleTime: 10 * 60_000 });

  const items = useMemo(() => listQ.data?.pages.flatMap((pg) => pg.items) ?? [], [listQ.data]);
  const total = listQ.data?.pages[0]?.total ?? null;
  const markers = useMemo(() => markersQ.data?.markers ?? [], [markersQ.data]);

  // The selected property may be outside the current page of results (shared link, saved list): fetch it directly.
  const inList = selectedSlug ? items.find((i) => i.slug === selectedSlug) : undefined;
  const selectedQ = useQuery({
    queryKey: ["property", selectedSlug],
    queryFn: ({ signal }) => fetchProperty(selectedSlug as string, signal),
    enabled: !!selectedSlug,
    retry: false,
  });
  const selected: PropertySummary | null = inList ?? (selectedQ.data ? detailToSummary(selectedQ.data) : null);

  // Opened from /saved or a shared link with a property but no viewport: centre on it once.
  const centredOn = useRef<string | null>(null);
  useEffect(() => {
    if (selectedQ.data && selectedSlug && !parseView(new URLSearchParams(window.location.search)) && centredOn.current !== selectedSlug) {
      centredOn.current = selectedSlug;
      issue({ kind: "jump", view: { lat: selectedQ.data.latitude, lng: selectedQ.data.longitude, zoom: 15 } });
    }
  }, [selectedQ.data, selectedSlug, issue]);

  // Neighbourhood chosen: frame its markers once they arrive.
  const fittedHood = useRef<string | null>(null);
  useEffect(() => {
    if (!filters.neighborhood) { fittedHood.current = null; return; }
    if (fittedHood.current !== filters.neighborhood && markersQ.data && !markersQ.isPlaceholderData && markersQ.data.markers.length > 0) {
      fittedHood.current = filters.neighborhood;
      issue({ kind: "fit", points: markersQ.data.markers });
    }
  }, [filters.neighborhood, markersQ.data, markersQ.isPlaceholderData, issue]);

  // ---- actions ----
  const applyFilters = useCallback((f: Filters) => {
    updateUrl((p) => {
      FILTER_KEYS.forEach((k) => p.delete(k));
      filtersToParams(f).forEach((v, k) => p.append(k, v));
      p.delete("sel");
    }, "push");
    setFiltersOpen(false);
  }, []);

  const select = useCallback((slug: string | null) => {
    updateUrl((p) => (slug ? p.set("sel", slug) : p.delete("sel")), "replace");
  }, []);

  const setMobileView = (v: "map" | "list") => updateUrl((p) => (v === "list" ? p.set("v", "list") : p.delete("v")), "replace");

  const onPickSuggestion = (s: Suggestion) => {
    if (s.type === "neighborhood" && s.slug) {
      applyFilters({ ...filters, neighborhood: s.slug });
    } else if (s.latitude !== null && s.longitude !== null) {
      issue({ kind: "fly", view: { lat: s.latitude, lng: s.longitude, zoom: 15 } });
    }
    setMobileView("map");
  };

  const hoodName = hoodsQ.data?.find((h) => h.slug === filters.neighborhood)?.name;
  const chips = useMemo(() => activeChips(filters, hoodName), [filters, hoodName]);

  // Where "Back to map" should return to from a detail page.
  const exploreQuery = params.toString();
  const detailHref = useCallback(
    (slug: string) => `/properties/${encodeURIComponent(slug)}${exploreQuery ? `?from=${encodeURIComponent(exploreQuery)}` : ""}`,
    [exploreQuery],
  );

  const forcedList = mapFailed;
  const showList = listView || forcedList;
  const queryError = (listQ.error ?? null) as Error | null;

  return (
    <div className={`relative grid h-full grid-rows-[auto_minmax(0,1fr)] ${panelOpen ? "md:grid-cols-[minmax(0,1fr)_minmax(340px,380px)] lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,1fr)_460px]" : "md:grid-cols-1"}`}>
      {/* Toolbar: search, filters, active filters */}
      <div className="z-20 col-span-full border-b border-line bg-surface">
        <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4">
          <div className="min-w-0 flex-1 md:max-w-xl"><SearchBox onPick={onPickSuggestion} /></div>
          <button type="button" onClick={() => setFiltersOpen(true)}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md border border-line-2 bg-surface px-3.5 text-body font-medium hover:bg-hover">
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            Filters
            {filterCount(filters) > 0 && (
              <span className="rounded-full bg-accent px-1.5 text-xs text-accent-ink" aria-label={`${filterCount(filters)} active`}>{filterCount(filters)}</span>
            )}
          </button>
        </div>
        {chips.length > 0 && (
          <ul aria-label="Active filters" className="flex flex-wrap items-center gap-1.5 px-3 pb-2.5 sm:px-4">
            {chips.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => applyFilters(removeChip(filters, c.id))} aria-label={`Remove filter ${c.label}`}
                  className="inline-flex min-h-8 items-center gap-1 rounded-md border border-line-2 bg-surface-2 py-1 pl-2.5 pr-1.5 text-sm hover:bg-hover">
                  {c.label} <X className="h-3.5 w-3.5 text-ink-3" aria-hidden />
                </button>
              </li>
            ))}
            <li><button type="button" onClick={() => applyFilters({ ...EMPTY_FILTERS })} className="px-2 text-sm font-medium text-accent hover:text-accent-hover hover:underline">Reset all</button></li>
          </ul>
        )}
      </div>

      {/* Map */}
      <section aria-label="Map" className={`${showList ? "hidden md:block" : "block"} relative row-start-2 min-h-0 md:col-start-1`}>
        {mapFailed ? (
          <div role="alert" className="flex h-full flex-col items-center justify-center gap-2 bg-bg p-6 text-center">
            <TriangleAlert className="h-8 w-8 text-warn-ink" aria-hidden />
            <p className="font-medium">The map couldn&apos;t be displayed</p>
            <p className="max-w-sm text-body text-ink-2">{mapFailure}. You can keep browsing every property in the list.</p>
          </div>
        ) : (
          <MapViewLoader markers={markers} selectedSlug={selectedSlug} onSelect={select} hoveredSlug={hoveredSlug} onHover={setHoveredSlug}
            initialView={urlView ?? DEFAULT_VIEW} command={command} onViewChange={onViewChange}
            onError={(msg, fatal) => { if (fatal) setMapFailure(msg); else setTileNotice(true); }} />
        )}

        {!mapFailed && (
          <div className="absolute right-2.5 top-[84px] z-10 flex flex-col gap-2">
            <button type="button" onClick={() => issue({ kind: "fly", view: DEFAULT_VIEW })} aria-label="Reset map to Baku" title="Reset map to Baku"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-line bg-surface text-ink-2 shadow-float hover:bg-hover hover:text-ink">
              <LocateFixed className="h-[18px] w-[18px]" aria-hidden />
            </button>
          </div>
        )}
        <button type="button" onClick={() => setPanelOpen((o) => !o)} aria-pressed={!panelOpen}
          className="absolute bottom-9 right-3 z-10 hidden h-9 items-center gap-2 rounded-md border border-line bg-surface px-3 text-sm font-medium text-ink-2 shadow-float hover:bg-hover md:inline-flex">
          {panelOpen ? <PanelRightClose className="h-4 w-4" aria-hidden /> : <PanelRightOpen className="h-4 w-4" aria-hidden />}
          {panelOpen ? "Hide results" : "Show results"}
        </button>

        {tileNotice && !mapFailed && (
          <p role="status" className="absolute left-3 top-3 rounded-md bg-warn-bg px-2.5 py-1 text-xs text-warn-ink">Some map tiles failed to load. Properties are still listed.</p>
        )}
        {markersQ.data?.truncated && (
          <p className="absolute left-3 top-3 rounded-md border border-line bg-surface px-2.5 py-1 text-xs text-ink-2 shadow-float">Showing the first {markersQ.data.markers.length.toLocaleString("en")} of {markersQ.data.total.toLocaleString("en")} on the map — zoom in to see more.</p>
        )}
        {markersQ.isError && !mapFailed && (
          <p role="alert" className="absolute left-3 top-3 rounded-md bg-danger-soft px-2.5 py-1 text-xs text-danger">Couldn&apos;t refresh map markers.</p>
        )}

        {selected && !showList && (
          <div className="pointer-events-none absolute inset-x-3 bottom-[72px] z-10 md:inset-x-auto md:bottom-6 md:left-4 md:w-[400px]">
            <SelectedPreview property={selected} detailHref={detailHref(selected.slug)} onClose={() => select(null)} />
          </div>
        )}
      </section>

      {/* Results */}
      <section aria-label="Results" className={`${showList ? "block" : "hidden"} row-start-2 min-h-0 border-line ${panelOpen ? "md:col-start-2 md:block md:border-l" : "md:hidden"}`}>
        <ResultsPanel
          items={items} total={total} isLoading={listQ.isPending && queriesEnabled || !queriesEnabled}
          isFetching={listQ.isFetching} error={queryError} onRetry={() => { listQ.refetch(); markersQ.refetch(); }}
          hasNext={!!listQ.hasNextPage} isFetchingNext={listQ.isFetchingNextPage} onLoadMore={() => listQ.fetchNextPage()}
          selectedSlug={selectedSlug} onSelect={(s) => select(s)} onHover={setHoveredSlug} detailHref={detailHref}
          hasFilters={chips.length > 0} onResetAll={() => applyFilters({ ...EMPTY_FILTERS })}
          sort={filters.sort} currencySelected={filters.currency !== null}
          onSort={(s) => applyFilters({ ...filters, sort: s })}
          mapUnavailable={mapFailed}
        />
      </section>

      {/* Mobile map/list switch */}
      {!mapFailed && (
        <div className="pointer-events-none absolute inset-x-0 bottom-safe z-20 flex justify-center md:hidden">
          <div role="group" aria-label="Map or list" className="pointer-events-auto inline-flex rounded-xl border border-line bg-surface p-1 shadow-float">
            <button type="button" aria-pressed={!showList} onClick={() => setMobileView("map")}
              className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-body font-medium ${!showList ? "bg-ink text-white" : "text-ink-2"}`}>
              <MapIcon className="h-4 w-4" aria-hidden /> Map
            </button>
            <button type="button" aria-pressed={showList} onClick={() => setMobileView("list")}
              className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-body font-medium ${showList ? "bg-ink text-white" : "text-ink-2"}`}>
              <List className="h-4 w-4" aria-hidden /> List{total !== null ? ` (${total})` : ""}
            </button>
          </div>
        </div>
      )}

      {filtersOpen && (
        <FilterSheet filters={filters} neighborhoods={hoodsQ.data ?? []} onApply={applyFilters} onClose={() => setFiltersOpen(false)} />
      )}
    </div>
  );
}
