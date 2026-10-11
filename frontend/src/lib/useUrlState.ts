"use client";

import { useMemo, useSyncExternalStore } from "react";

const EVENT = "investin:urlchange";

function subscribe(cb: () => void) {
  window.addEventListener("popstate", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("popstate", cb);
    window.removeEventListener(EVENT, cb);
  };
}

/** The current query string; a stable string snapshot so React only re-renders when it really changes. */
export function useUrlSearch(): string {
  return useSyncExternalStore(subscribe, () => window.location.search, () => "");
}

export function useUrlParams(): URLSearchParams {
  const search = useUrlSearch();
  return useMemo(() => new URLSearchParams(search), [search]);
}

/**
 * Update the query string with the native History API (Next.js syncs it with usePathname/useSearchParams).
 * 'push' creates a history entry (filters), 'replace' does not (map movement, selection).
 */
export function updateUrl(mutate: (p: URLSearchParams) => void, mode: "push" | "replace" = "replace") {
  const p = new URLSearchParams(window.location.search);
  mutate(p);
  const qs = p.toString();
  const url = window.location.pathname + (qs ? `?${qs}` : "");
  if (url === window.location.pathname + window.location.search) return;
  if (mode === "push") window.history.pushState(null, "", url);
  else window.history.replaceState(null, "", url);
  window.dispatchEvent(new Event(EVENT));
}
