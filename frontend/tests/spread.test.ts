import { describe, expect, it } from "vitest";
import { spreadStacked } from "@/lib/spread";

const m = (slug: string, latitude: number, longitude: number) => ({ slug, latitude, longitude });

describe("spreadStacked", () => {
  it("leaves unique positions untouched", () => {
    const input = [m("a", 40.4, 49.8), m("b", 40.5, 49.9)];
    expect(spreadStacked(input)).toEqual(input);
  });
  it("fans out markers sharing a position so no two coincide", () => {
    const input = ["a", "b", "c", "d", "e", "f", "g", "h"].map((s) => m(s, 40.4, 49.8));
    const out = spreadStacked(input);
    expect(out).toHaveLength(8);
    expect(new Set(out.map((x) => `${x.latitude.toFixed(7)},${x.longitude.toFixed(7)}`)).size).toBe(8);
    for (const x of out) expect(Math.abs(x.latitude - 40.4)).toBeLessThan(0.001);
  });
  it("is deterministic regardless of input order", () => {
    const a = spreadStacked([m("x", 1, 1), m("y", 1, 1)]);
    const b = spreadStacked([m("y", 1, 1), m("x", 1, 1)]);
    expect(a.find((p) => p.slug === "x")).toEqual(b.find((p) => p.slug === "x"));
  });
});
