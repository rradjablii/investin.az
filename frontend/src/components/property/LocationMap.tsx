"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { Map as MlMap, Marker, NavigationControl, setWorkerUrl } from "maplibre-gl";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
import { useEffect, useRef, useState } from "react";
import { MAP_STYLE_URL } from "@/lib/config";

export default function LocationMap({ latitude, longitude, approximate }: { latitude: number; longitude: number; approximate: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    let map: MlMap;
    try {
      map = new MlMap({ container: ref.current, style: MAP_STYLE_URL, center: [longitude, latitude], zoom: approximate ? 13.5 : 15, attributionControl: { compact: true } });
    } catch {
      queueMicrotask(() => setFailed(true));
      return;
    }
    map.addControl(new NavigationControl({ showCompass: false }), "bottom-right");
    new Marker({ color: "#526c63" }).setLngLat([longitude, latitude]).addTo(map);
    map.on("error", () => setFailed(true));
    return () => map.remove();
  }, [latitude, longitude, approximate]);

  if (failed) {
    return (
      <div className="flex h-full items-center justify-center bg-bg p-4 text-center text-sm text-ink-2">
        Map unavailable. {approximate ? "Approximate" : "Exact"} position: {latitude.toFixed(3)}, {longitude.toFixed(3)}
      </div>
    );
  }
  return <div ref={ref} className="h-full w-full" role="region" aria-label={`Map showing the ${approximate ? "approximate" : "exact"} location`} />;
}
