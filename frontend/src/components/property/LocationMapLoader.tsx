"use client";

import dynamic from "next/dynamic";

const LocationMap = dynamic(() => import("./LocationMap"), { ssr: false, loading: () => <div className="skeleton h-full w-full" /> });
export default LocationMap;
