"use client";

import { Bookmark } from "lucide-react";
import { useSaved } from "@/lib/saved";

export default function SaveButton({ slug, title, variant = "icon" }: { slug: string; title: string; variant?: "icon" | "full" }) {
  const { isSaved, toggle } = useSaved();
  const saved = isSaved(slug);
  const label = saved ? `Remove ${title} from saved` : `Save ${title}`;
  if (variant === "full") {
    return (
      <button
        type="button"
        aria-pressed={saved}
        onClick={() => toggle(slug)}
        className="inline-flex items-center gap-2 rounded-md border border-line-2 bg-surface px-3 py-2 text-sm font-medium hover:bg-bg"
      >
        <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} aria-hidden />
        {saved ? "Saved" : "Save"}
      </button>
    );
  }
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={label}
      title={saved ? "Saved — click to remove" : "Save"}
      onClick={(e) => {
        e.stopPropagation();
        toggle(slug);
      }}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface/95 text-ink shadow-sm ring-1 ring-line hover:bg-surface"
    >
      <Bookmark className={`h-[18px] w-[18px] ${saved ? "fill-current text-accent" : ""}`} aria-hidden />
    </button>
  );
}
