"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import PropertyImage from "@/components/ui/PropertyImage";
import type { Image } from "@/lib/types";

export default function Gallery({ images }: { images: Image[] }) {
  const [index, setIndex] = useState(0);
  if (images.length === 0) {
    return <PropertyImage src={null} alt="" className="aspect-[3/2] w-full rounded-xl border border-line" />;
  }
  const go = (d: number) => setIndex((i) => (i + d + images.length) % images.length);
  const current = images[index];
  const nav = "absolute top-1/2 -translate-y-1/2 rounded-full border border-line bg-surface/95 p-2.5 text-ink hover:bg-surface";
  return (
    <div role="group" aria-roledescription="carousel" aria-label="Property photographs"
      onKeyDown={(e) => { if (e.key === "ArrowLeft") go(-1); if (e.key === "ArrowRight") go(1); }}>
      <div className="relative overflow-hidden rounded-xl border border-line">
        <PropertyImage key={current.url} src={current.url} alt={current.alt} priority sizes="(min-width: 1024px) 760px, 100vw" className="aspect-[3/2] w-full" />
        {images.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Previous photograph" className={`${nav} left-3`}><ChevronLeft className="h-5 w-5" aria-hidden /></button>
            <button type="button" onClick={() => go(1)} aria-label="Next photograph" className={`${nav} right-3`}><ChevronRight className="h-5 w-5" aria-hidden /></button>
            <p className="absolute bottom-3 right-3 rounded-md bg-ink/70 px-2 py-0.5 text-xs text-white" aria-live="polite">Photo {index + 1} of {images.length}</p>
          </>
        )}
      </div>
      {images.length > 1 && (
        <ul className="mt-2.5 flex gap-2 overflow-x-auto pb-1" aria-label="Photograph thumbnails">
          {images.map((img, i) => (
            <li key={img.url} className="shrink-0">
              <button type="button" onClick={() => setIndex(i)} aria-label={`Show photograph ${i + 1}`} aria-current={i === index}
                className={`block overflow-hidden rounded-lg ${i === index ? "ring-2 ring-accent ring-offset-1" : "border border-line opacity-80 hover:opacity-100"}`}>
                <PropertyImage src={img.url} alt="" sizes="96px" className="h-16 w-24" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
