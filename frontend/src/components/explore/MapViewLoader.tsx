"use client";

import dynamic from "next/dynamic";
import type { MapViewProps } from "./mapTypes";

/** MapLibre needs the browser; load it lazily so the rest of the page renders first. */
const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div className="skeleton h-full w-full" role="status" aria-label="Loading map" />,
});

export default function MapViewLoader(props: MapViewProps) {
  return <MapView {...props} />;
}
