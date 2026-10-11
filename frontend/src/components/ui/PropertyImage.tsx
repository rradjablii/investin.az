"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";

const WIDTHS = [320, 640, 960, 1280];

/** Responsive image with a skeleton while loading and a clear fallback when the file is missing or broken. */
export default function PropertyImage({
  src,
  alt,
  sizes = "(min-width: 1024px) 400px, 100vw",
  className = "",
  priority = false,
}: {
  src: string | null | undefined;
  alt: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (!src || failed) {
    return (
      <div role="img" aria-label={src ? "Image could not be loaded" : "No photograph available"}
        className={`flex flex-col items-center justify-center gap-1 bg-bg text-ink-3 ${className}`}>
        <ImageOff className="h-6 w-6" aria-hidden />
        <span className="text-xs">{src ? "Image unavailable" : "No photo yet"}</span>
      </div>
    );
  }
  const raster = !src.endsWith(".svg");
  return (
    <div className={`relative overflow-hidden bg-bg ${className}`}>
      {!loaded && <div className="skeleton absolute inset-0" aria-hidden />}
      {/* eslint-disable-next-line @next/next/no-img-element -- images are served by our own media endpoint, resized there */}
      <img
        src={raster ? `${src}?w=640` : src}
        srcSet={raster ? WIDTHS.map((w) => `${src}?w=${w} ${w}w`).join(", ") : undefined}
        sizes={raster ? sizes : undefined}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
