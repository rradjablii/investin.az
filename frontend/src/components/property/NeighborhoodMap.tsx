"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { LngLatBounds, Map as MlMap, NavigationControl, setWorkerUrl } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { MAP_STYLE_URL } from "@/lib/config";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

export interface MiniPoint { slug: string; latitude: number; longitude: number; label: string }

/**
 * Overview map for a neighborhood: its centre point, the real published properties, and — only when valid boundary
 * data exists — the boundary polygon. No boundary is ever drawn from a centre point.
 */
export default function NeighborhoodMap({ centre, points, boundaryGeoJson, name }: {
  centre: { latitude: number; longitude: number }; points: MiniPoint[]; boundaryGeoJson: string | null; name: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    let map: MlMap;
    try {
      map = new MlMap({ container: ref.current, style: MAP_STYLE_URL, center: [centre.longitude, centre.latitude], zoom: 12.5, attributionControl: { compact: true } });
    } catch {
      queueMicrotask(() => setFailed(true));
      return;
    }
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.on("error", () => setFailed(true));
    map.on("load", () => {
      const bounds = new LngLatBounds([centre.longitude, centre.latitude], [centre.longitude, centre.latitude]);
      let boundary: GeoJSON.Geometry | null = null;
      if (boundaryGeoJson) {
        try {
          boundary = JSON.parse(boundaryGeoJson) as GeoJSON.Geometry;
          const walk = (c: unknown): void => {
            if (Array.isArray(c) && typeof c[0] === "number") bounds.extend(c as [number, number]);
            else if (Array.isArray(c)) c.forEach(walk);
          };
          walk((boundary as GeoJSON.Polygon).coordinates);
        } catch {
          boundary = null; // invalid boundary data is ignored, never guessed
        }
      }
      if (boundary) {
        map.addSource("hood-boundary", { type: "geojson", data: { type: "Feature", properties: {}, geometry: boundary } });
        map.addLayer({ id: "hood-boundary-fill", type: "fill", source: "hood-boundary", paint: { "fill-color": "#526c63", "fill-opacity": 0.08 } });
        map.addLayer({ id: "hood-boundary-line", type: "line", source: "hood-boundary", paint: { "line-color": "#526c63", "line-width": 1.5 } });
      }
      points.forEach((p) => bounds.extend([p.longitude, p.latitude]));
      map.addSource("hood-points", {
        type: "geojson",
        data: { type: "FeatureCollection", features: points.map((p) => ({ type: "Feature", properties: { label: p.label }, geometry: { type: "Point", coordinates: [p.longitude, p.latitude] } })) },
      });
      map.addLayer({ id: "hood-points", type: "circle", source: "hood-points", paint: { "circle-radius": 6, "circle-color": "#526c63", "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 } });
      map.addSource("hood-centre", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [centre.longitude, centre.latitude] } } });
      map.addLayer({ id: "hood-centre", type: "circle", source: "hood-centre", paint: { "circle-radius": 5, "circle-color": "#ffffff", "circle-stroke-color": "#20242a", "circle-stroke-width": 2 } });
      if (points.length > 0 || boundary) map.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: 0 });
    });
    return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (failed) {
    return <div className="flex h-full items-center justify-center bg-surface-2 p-4 text-center text-body text-ink-2">The map is unavailable right now. {name} is centred near {centre.latitude.toFixed(3)}, {centre.longitude.toFixed(3)}.</div>;
  }
  return <div ref={ref} className="h-full w-full" role="region" aria-label={`Map of ${name}`} />;
}
