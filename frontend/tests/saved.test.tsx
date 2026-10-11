import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { resetSavedStoreForTests, useSaved } from "@/lib/saved";

beforeEach(() => resetSavedStoreForTests());

describe("browser-local saved properties", () => {
  it("saves, persists across a reload, and removes", () => {
    const first = renderHook(() => useSaved());
    expect(first.result.current.slugs).toEqual([]);
    act(() => first.result.current.toggle("a"));
    act(() => first.result.current.toggle("b"));
    expect(first.result.current.slugs).toEqual(["b", "a"]);
    expect(JSON.parse(window.localStorage.getItem("investin.saved.v1")!)).toEqual(["b", "a"]);
    first.unmount();

    // "refresh": the in-memory cache is lost, only localStorage remains
    resetSavedStoreForTests();
    const second = renderHook(() => useSaved());
    expect(second.result.current.isSaved("a")).toBe(true);
    act(() => second.result.current.remove("a"));
    expect(second.result.current.slugs).toEqual(["b"]);
  });

  it("toggling twice un-saves", () => {
    const { result } = renderHook(() => useSaved());
    act(() => result.current.toggle("x"));
    act(() => result.current.toggle("x"));
    expect(result.current.count).toBe(0);
  });

  it("ignores corrupted storage", () => {
    window.localStorage.setItem("investin.saved.v1", "{not json");
    const { result } = renderHook(() => useSaved());
    expect(result.current.slugs).toEqual([]);
  });

  it("ignores non-string entries", () => {
    window.localStorage.setItem("investin.saved.v1", JSON.stringify(["ok", 5, null, { a: 1 }]));
    const { result } = renderHook(() => useSaved());
    expect(result.current.slugs).toEqual(["ok"]);
  });
});
