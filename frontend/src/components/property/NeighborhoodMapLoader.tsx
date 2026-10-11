"use client";

import dynamic from "next/dynamic";

const NeighborhoodMap = dynamic(() => import("./NeighborhoodMap"), { ssr: false, loading: () => <div className="skeleton h-full w-full" /> });
export default NeighborhoodMap;
