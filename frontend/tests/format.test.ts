import { describe, expect, it } from "vitest";
import { areaSummary, formatMarkerPrice, formatPrice } from "@/lib/format";

describe("price formatting", () => {
  it("keeps the original currency and exact amount", () => {
    expect(formatPrice(245000, "USD")).toBe("$245,000");
    expect(formatPrice(245000, "AZN")).toBe("₼245,000");
    expect(formatPrice(99999.5, "EUR")).toBe("€100,000");
  });
  it("abbreviates marker labels but never changes the currency", () => {
    expect(formatMarkerPrice(245000, "USD")).toBe("$245K");
    expect(formatMarkerPrice(1_250_000, "USD")).toBe("$1.3M");
    expect(formatMarkerPrice(850, "EUR")).toBe("€850");
    expect(formatMarkerPrice(571000, "AZN")).toBe("AZN 571K");
  });
});

describe("area semantics", () => {
  it("uses plot area for land and floor area otherwise", () => {
    expect(areaSummary({ propertyType: "land", areaSqm: null, landAreaSqm: 600 })).toBe("600 m²");
    expect(areaSummary({ propertyType: "apartment", areaSqm: 60, landAreaSqm: null })).toBe("60 m²");
    expect(areaSummary({ propertyType: "house", areaSqm: 200, landAreaSqm: 800 })).toBe("200 m² · 800 m² plot");
  });
  it("never shows an unknown area as zero", () => {
    expect(areaSummary({ propertyType: "apartment", areaSqm: null, landAreaSqm: null })).toBe("Area unknown");
  });
});
