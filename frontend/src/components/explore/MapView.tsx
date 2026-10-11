"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { LngLatBounds, Map as MlMap, NavigationControl, setWorkerUrl, type GeoJSONSource, type MapGeoJSONFeature, type MapMouseEvent } from "maplibre-gl";
import { useEffect, useRef } from "react";
import { MAP_STYLE_URL } from "@/lib/config";
import { formatMarkerPrice } from "@/lib/format";
import { spreadStacked } from "@/lib/spread";
import type { MapViewProps } from "./mapTypes";

const SOURCE = "properties";
const SELECTED_SOURCE = "selected-property";
const FONT = process.env.NEXT_PUBLIC_MAP_FONT ?? "Noto Sans Bold";
const ACCENT = "#0f5f5a";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

/** Draws a stretchable rounded "price pill" for icon-text-fit. */
function pillImage(fill: string, stroke: string): ImageData {
  const w = 64, h = 48, r = 14;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.beginPath();
  ctx.roundRect(3, 3, w - 6, h - 6, r);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = stroke;
  ctx.stroke();
  return ctx.getImageData(0, 0, w, h);
}

function selectedGeoJSON(markers: MapViewProps["markers"], slug: string | null): GeoJSON.FeatureCollection {
  return toGeoJSON(slug ? markers.filter((m) => m.slug === slug) : []);
}

function toGeoJSON(markers: MapViewProps["markers"]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: spreadStacked(markers).map((m) => ({
      type: "Feature",
      properties: { slug: m.slug, label: formatMarkerPrice(m.askingPrice, m.currency), price: m.askingPrice },
      geometry: { type: "Point", coordinates: [m.longitude, m.latitude] },
    })),
  };
}

export default function MapView({ markers, selectedSlug, onSelect, initialView, command, onViewChange, onError }: MapViewProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const readyRef = useRef(false);
  // Latest props for event handlers registered once.
  const latest = useRef({ markers, selectedSlug, onSelect, onViewChange, onError });
  const lastCommand = useRef<number>(-1);
  useEffect(() => {
    latest.current = { markers, selectedSlug, onSelect, onViewChange, onError };
  });

  useEffect(() => {
    if (!container.current) return;
    let map: MlMap;
    try {
      map = new MlMap({
        container: container.current,
        style: MAP_STYLE_URL,
        center: [initialView.lng, initialView.lat],
        zoom: initialView.zoom,
        attributionControl: { compact: true },
        cooperativeGestures: false,
      });
    } catch (e) {
      latest.current.onError(e instanceof Error ? e.message : "Map could not be started", true);
      return;
    }
    mapRef.current = map;
    // Test hook: lets end-to-end tests convert coordinates to pixels. Only compiled in when NEXT_PUBLIC_E2E=1.
    if (process.env.NEXT_PUBLIC_E2E === "1") (window as unknown as { __investinMap?: MlMap }).__investinMap = map;
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");

    const emitView = () => {
      const c = map.getCenter();
      const b = map.getBounds();
      latest.current.onViewChange(
        { lat: c.lat, lng: c.lng, zoom: map.getZoom() },
        { west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() },
      );
    };

    map.on("load", () => {
      map.addImage("pill", pillImage("#ffffff", "#44403c"), {
        pixelRatio: 2, stretchX: [[20, 44]], stretchY: [[16, 32]], content: [20, 16, 44, 32],
      });
      map.addImage("pill-selected", pillImage(ACCENT, "#ffffff"), {
        pixelRatio: 2, stretchX: [[20, 44]], stretchY: [[16, 32]], content: [20, 16, 44, 32],
      });
      map.addSource(SOURCE, {
        type: "geojson", data: toGeoJSON(latest.current.markers), cluster: true, clusterRadius: 48, clusterMaxZoom: 14,
      });
      map.addLayer({
        id: "clusters", type: "circle", source: SOURCE, filter: ["has", "point_count"],
        paint: {
          "circle-color": ACCENT, "circle-opacity": 0.92, "circle-stroke-color": "#ffffff", "circle-stroke-width": 2,
          "circle-radius": ["step", ["get", "point_count"], 16, 10, 20, 30, 25],
        },
      });
      map.addLayer({
        id: "cluster-count", type: "symbol", source: SOURCE, filter: ["has", "point_count"],
        layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": [FONT], "text-size": 13, "text-allow-overlap": true },
        paint: { "text-color": "#ffffff" },
      });
      map.addLayer({
        id: "prices", type: "symbol", source: SOURCE, filter: ["!", ["has", "point_count"]],
        layout: {
          "icon-image": "pill", "icon-text-fit": "both", "icon-text-fit-padding": [3, 8, 3, 8],
          "text-field": ["get", "label"], "text-font": [FONT], "text-size": 12.5,
          "icon-allow-overlap": true, "text-allow-overlap": true, "symbol-sort-key": ["-", 0, ["get", "price"]],
        },
        paint: { "text-color": "#1c1917" },
      });
      // The selected marker lives in its own un-clustered source so it stays visible even when its neighbours are clustered.
      map.addSource(SELECTED_SOURCE, { type: "geojson", data: selectedGeoJSON(latest.current.markers, latest.current.selectedSlug) });
      map.addLayer({
        id: "prices-selected", type: "symbol", source: SELECTED_SOURCE,
        layout: {
          "icon-image": "pill-selected", "icon-text-fit": "both", "icon-text-fit-padding": [5, 10, 5, 10],
          "text-field": ["get", "label"], "text-font": [FONT], "text-size": 13.5,
          "icon-allow-overlap": true, "text-allow-overlap": true,
        },
        paint: { "text-color": "#ffffff" },
      });
      readyRef.current = true;
      emitView();
    });

    map.on("click", "clusters", async (e) => {
      const f = map.queryRenderedFeatures(e.point, { layers: ["clusters"] })[0];
      if (!f) return;
      const src = map.getSource(SOURCE) as GeoJSONSource;
      const zoom = await src.getClusterExpansionZoom(f.properties.cluster_id as number);
      map.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom: zoom + 0.5 });
    });
    const pick = (e: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
      const slug = e.features?.[0]?.properties?.slug as string | undefined;
      if (slug) latest.current.onSelect(slug);
    };
    map.on("click", "prices", pick);
    map.on("click", "prices-selected", pick);
    map.on("click", (e) => {
      const hit = map.queryRenderedFeatures(e.point, { layers: ["clusters", "prices", "prices-selected"] });
      if (hit.length === 0) latest.current.onSelect(null);
    });
    for (const layer of ["clusters", "prices", "prices-selected"]) {
      map.on("mouseenter", layer, () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", layer, () => (map.getCanvas().style.cursor = ""));
    }
    map.on("moveend", () => readyRef.current && emitView());
    map.on("error", (e) => {
      const msg = e.error?.message ?? "Map error";
      // Before the style has loaded, errors are fatal (bad style URL, blocked network). Afterwards a missing tile is not.
      latest.current.onError(msg, !readyRef.current);
    });

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(container.current);

    return () => {
      ro.disconnect();
      readyRef.current = false;
      map.remove();
      mapRef.current = null;
    };
    // The map is created once; changing props are handled by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // markers -> source
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    (map.getSource(SOURCE) as GeoJSONSource | undefined)?.setData(toGeoJSON(markers));
    (map.getSource(SELECTED_SOURCE) as GeoJSONSource | undefined)?.setData(selectedGeoJSON(markers, latest.current.selectedSlug));
  }, [markers]);

  // selection -> highlighted layer (+ pan into view when chosen from the list)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    (map.getSource(SELECTED_SOURCE) as GeoJSONSource | undefined)?.setData(selectedGeoJSON(markers, selectedSlug));
    const m = selectedSlug ? markers.find((x) => x.slug === selectedSlug) : undefined;
    if (m && !map.getBounds().contains([m.longitude, m.latitude])) {
      map.easeTo({ center: [m.longitude, m.latitude] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlug]);

  // imperative commands (search suggestion, neighbourhood, URL navigation)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !command || command.id === lastCommand.current) return;
    lastCommand.current = command.id;
    if (command.kind === "fit" && command.points?.length) {
      const b = new LngLatBounds();
      command.points.forEach((p) => b.extend([p.longitude, p.latitude]));
      map.fitBounds(b, { padding: 60, maxZoom: 15, duration: 600 });
    } else if (command.view) {
      const opts = { center: [command.view.lng, command.view.lat] as [number, number], zoom: command.view.zoom };
      if (command.kind === "jump") map.jumpTo(opts);
      else map.flyTo({ ...opts, essential: true });
    }
  }, [command]);

  return (
    <div
      ref={container}
      role="region"
      aria-label="Map of property locations. The same properties are listed in the results panel."
      className="h-full w-full"
      data-testid="map"
    />
  );
}
