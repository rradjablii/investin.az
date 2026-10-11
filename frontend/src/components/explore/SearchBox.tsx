"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, MapPin, Search, X } from "lucide-react";
import { fetchSuggestions } from "@/lib/api";
import type { Suggestion } from "@/lib/types";

export default function SearchBox({ onPick }: { onPick: (s: Suggestion) => void }) {
  const [text, setText] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(text.trim()), 200);
    return () => clearTimeout(t);
  }, [text]);

  const { data, isFetching } = useQuery({
    queryKey: ["suggestions", debounced],
    queryFn: ({ signal }) => fetchSuggestions(debounced, signal),
    enabled: debounced.length >= 2,
    staleTime: 5 * 60_000,
  });
  const options = debounced.length >= 2 ? (data ?? []) : [];

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const pick = (s: Suggestion) => {
    onPick(s);
    setText("");
    setDebounced("");
    setOpen(false);
    setActive(-1);
  };

  return (
    <div ref={wrapRef} className="relative min-w-0 flex-1">
      <label htmlFor={`${listId}-input`} className="sr-only">Search neighborhoods and places</label>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" aria-hidden />
      <input
        id={`${listId}-input`}
        role="combobox"
        aria-expanded={open && debounced.length >= 2}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        value={text}
        placeholder="Search a neighborhood or landmark"
        onChange={(e) => { setText(e.target.value); setOpen(true); setActive(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(options.length - 1, a + 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
          else if (e.key === "Enter" && active >= 0 && options[active]) { e.preventDefault(); pick(options[active]); }
          else if (e.key === "Escape") setOpen(false);
        }}
        className="h-10 w-full rounded-md border border-line-2 bg-surface pl-9 pr-8 text-sm placeholder:text-ink-3"
      />
      {text && (
        <button type="button" aria-label="Clear search" onClick={() => { setText(""); setDebounced(""); }}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-ink-3 hover:text-ink">
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
      <ul id={listId} role="listbox" hidden={!(open && debounced.length >= 2)}
        className="absolute left-0 right-0 top-11 z-30 max-h-72 overflow-auto rounded-md border border-line bg-surface py-1 shadow-lg">
        {options.map((s, i) => (
          <li key={`${s.type}-${s.label}`} id={`${listId}-${i}`} role="option" aria-selected={i === active}
            onMouseDown={(e) => { e.preventDefault(); pick(s); }}
            className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm ${i === active ? "bg-accent-soft" : "hover:bg-bg"}`}>
            {s.type === "neighborhood" ? <Building2 className="h-4 w-4 text-ink-3" aria-hidden /> : <MapPin className="h-4 w-4 text-ink-3" aria-hidden />}
            <span>{s.label}</span>
            <span className="ml-auto text-xs text-ink-3">{s.type === "neighborhood" ? "Neighborhood" : "Place"}</span>
          </li>
        ))}
        {options.length === 0 && (
          <li role="presentation" className="px-3 py-2 text-sm text-ink-3">{isFetching ? "Searching…" : "No matching neighborhoods or places"}</li>
        )}
      </ul>
    </div>
  );
}
