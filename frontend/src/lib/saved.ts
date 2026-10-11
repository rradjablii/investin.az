"use client";

import { useCallback, useSyncExternalStore } from "react";

const KEY = "investin.saved.v1";
export const MAX_COMPARE = 4;

const EMPTY: string[] = [];
let cache: string[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function read(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    return parsed.filter((s): s is string => typeof s === "string").slice(0, 200);
  } catch {
    return EMPTY; // storage blocked or corrupted: behave as "nothing saved"
  }
}

function write(next: string[]) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota or private mode: keep the in-memory value for this session */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) {
      cache = read();
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): string[] {
  if (!loaded) {
    cache = read();
    loaded = true;
  }
  return cache;
}

const getServerSnapshot = () => EMPTY;

/** Test helper: forget in-memory state so the next read hits localStorage again. */
export function resetSavedStoreForTests() {
  loaded = false;
  cache = EMPTY;
}

/**
 * Browser-local saved properties. The server snapshot is empty, so server HTML and the first client render agree;
 * saved state appears right after hydration without a mismatch.
 */
export function useSaved() {
  const slugs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isSaved = useCallback((slug: string) => slugs.includes(slug), [slugs]);
  const toggle = useCallback((slug: string) => {
    const current = getSnapshot();
    write(current.includes(slug) ? current.filter((s) => s !== slug) : [slug, ...current]);
  }, []);
  const remove = useCallback((slug: string) => write(getSnapshot().filter((s) => s !== slug)), []);
  return { slugs, count: slugs.length, isSaved, toggle, remove };
}
