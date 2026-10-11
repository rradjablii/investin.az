import { describe, expect, it } from "vitest";
import { EMPTY_FILTERS, activeChips, filterCount, filtersToParams, hasErrors, parseFilters, parseView, removeChip, validateFilters } from "@/lib/filters";

const parse = (qs: string) => parseFilters(new URLSearchParams(qs));

describe("filter URL state", () => {
  it("round-trips every supported filter", () => {
    const f = {
      ...EMPTY_FILTERS, type: ["apartment", "house"] as const, currency: "USD" as const, minPrice: 50000, maxPrice: 200000,
      minBedrooms: 2, maxBedrooms: 4, minArea: 40, maxArea: 120, constructionStatus: ["completed"] as const,
      neighborhood: "nasimi", freshnessDays: 30, sort: "price_asc" as const,
    };
    const back = parse(filtersToParams({ ...f, type: [...f.type], constructionStatus: [...f.constructionStatus] }).toString());
    expect(back).toEqual({ ...f, type: [...f.type], constructionStatus: [...f.constructionStatus] });
  });

  it("an empty query yields the empty filter set", () => {
    expect(parse("")).toEqual(EMPTY_FILTERS);
    expect(filtersToParams(EMPTY_FILTERS).toString()).toBe("");
  });

  it("drops malformed or unknown values instead of failing", () => {
    const f = parse("type=castle&type=house&currency=XXX&minPrice=abc&minBedrooms=1.5&constructionStatus=nope&freshnessDays=-4&sort=weird");
    expect(f.type).toEqual(["house"]);
    expect(f.currency).toBeNull();
    expect(f.minPrice).toBeNull();
    expect(f.minBedrooms).toBeNull();
    expect(f.constructionStatus).toEqual([]);
    expect(f.freshnessDays).toBeNull();
    expect(f.sort).toBe("newest");
  });

  it("accepts comma-separated lists and de-duplicates", () => {
    expect(parse("type=apartment,house&type=apartment").type).toEqual(["apartment", "house"]);
  });

  it("falls back from price sorting when no currency is chosen", () => {
    expect(parse("sort=price_desc").sort).toBe("newest");
    expect(parse("sort=price_desc&currency=AZN").sort).toBe("price_desc");
  });

  it("keeps zero as a real value and null as 'unset'", () => {
    expect(parse("minBedrooms=0").minBedrooms).toBe(0);
    expect(parse("").minBedrooms).toBeNull();
  });

  it("parses the viewport only when complete and in range", () => {
    expect(parseView(new URLSearchParams("lat=40.4&lng=49.8&z=12"))).toEqual({ lat: 40.4, lng: 49.8, zoom: 12 });
    expect(parseView(new URLSearchParams("lat=40.4&lng=49.8"))).toBeNull();
    expect(parseView(new URLSearchParams("lat=140&lng=49.8&z=12"))).toBeNull();
  });
});

describe("filter validation", () => {
  it("requires a currency for price filters", () => {
    expect(validateFilters({ ...EMPTY_FILTERS, minPrice: 10 }).currency).toBeTruthy();
    expect(hasErrors(validateFilters({ ...EMPTY_FILTERS, minPrice: 10, currency: "USD" }))).toBe(false);
  });
  it("rejects inverted ranges", () => {
    const e = validateFilters({ ...EMPTY_FILTERS, currency: "USD", minPrice: 9, maxPrice: 1, minBedrooms: 3, maxBedrooms: 1, minArea: 50, maxArea: 10 });
    expect(e.price && e.bedrooms && e.area).toBeTruthy();
  });
  it("requires a currency to sort by price", () => {
    expect(validateFilters({ ...EMPTY_FILTERS, sort: "price_asc" }).currency).toBeTruthy();
  });
});

describe("active filter chips", () => {
  const f = { ...EMPTY_FILTERS, type: ["apartment" as const], currency: "USD" as const, minPrice: 100000, neighborhood: "nasimi" };
  it("lists each active filter and counts them", () => {
    const labels = activeChips(f, "Nasimi").map((c) => c.label);
    expect(labels).toEqual(["Apartment", "USD from 100K", "Nasimi"]);
    expect(filterCount(f)).toBe(3);
  });
  it("removes a single filter at a time", () => {
    expect(removeChip(f, "type:apartment").type).toEqual([]);
    const noPrice = removeChip(f, "price");
    expect(noPrice.minPrice).toBeNull();
    expect(noPrice.neighborhood).toBe("nasimi");
    expect(removeChip(f, "neighborhood").neighborhood).toBeNull();
  });
  it("resets the sort when the currency chip is removed", () => {
    expect(removeChip({ ...EMPTY_FILTERS, currency: "USD", sort: "price_asc" }, "currency").sort).toBe("newest");
  });
});
