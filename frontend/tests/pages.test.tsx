import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { resetSavedStoreForTests } from "@/lib/saved";
import { detail, summary } from "./fixtures";

const api = vi.hoisted(() => ({ fetchProperty: vi.fn(), postInquiry: vi.fn() }));
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), ...api }));
const server = vi.hoisted(() => ({ getProperty: vi.fn(), getNeighborhood: vi.fn(), getNeighborhoodProperties: vi.fn() }));
vi.mock("@/lib/server-api", () => server);
vi.mock("@/components/property/LocationMapLoader", () => ({ default: () => <div data-testid="location-map" /> }));
vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("NEXT_NOT_FOUND"); },
  usePathname: () => "/", useRouter: () => ({ push() {}, replace() {} }),
}));

import InquiryForm from "@/components/property/InquiryForm";
import SavedApp from "@/components/saved/SavedApp";
import PropertyPage from "@/app/properties/[slug]/page";

const wrap = (ui: React.ReactElement) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);

beforeEach(() => {
  vi.clearAllMocks();
  resetSavedStoreForTests();
  server.getNeighborhood.mockResolvedValue(null);
  server.getNeighborhoodProperties.mockResolvedValue([]);
});

describe("property detail page", () => {
  it("renders the stored property with source, last-checked date and honest gaps", async () => {
    server.getProperty.mockResolvedValue(detail({ bathrooms: null, areaSqm: null, developerName: null }));
    render(await PropertyPage({ params: Promise.resolve({ slug: "flat-1" }), searchParams: Promise.resolve({ from: "lat%3D40.4%26z%3D12" }) }));
    expect(screen.getByRole("heading", { level: 1, name: "Sunny flat" })).toBeInTheDocument();
    expect(screen.getAllByText("$120,000").length).toBeGreaterThanOrEqual(1); // header + mobile action bar
    expect(screen.getByText("Asking price in USD, as advertised")).toBeInTheDocument();
    expect(screen.getByText("Test agency")).toBeInTheDocument();
    expect(screen.getAllByText("Not stated").length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText(/no independent verification step has been recorded/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Back to the map/ })).toHaveAttribute("href", "/explore?lat%3D40.4%26z%3D12");
  });

  it("shows only verification steps that were actually recorded", async () => {
    server.getProperty.mockResolvedValue(detail({ verifications: [{ kind: "location_reviewed", label: "Location reviewed", performedAt: "2026-10-01T00:00:00Z" }] }));
    render(await PropertyPage({ params: Promise.resolve({ slug: "flat-1" }), searchParams: Promise.resolve({}) }));
    expect(screen.getByText("Location reviewed")).toBeInTheDocument();
    expect(screen.queryByText("Source contacted")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Back to the map/ })).toHaveAttribute("href", "/explore?sel=flat-1");
  });

  it("flags demonstration data and approximate locations", async () => {
    server.getProperty.mockResolvedValue(detail({ demonstration: true }));
    render(await PropertyPage({ params: Promise.resolve({ slug: "flat-1" }), searchParams: Promise.resolve({}) }));
    expect(screen.getByText(/Fictional demonstration data/)).toBeInTheDocument();
    expect(screen.getByText(/Approximate location/)).toBeInTheDocument();
  });

  it("shows neighborhood context and related listings only from real data, never itself", async () => {
    server.getProperty.mockResolvedValue(detail());
    server.getNeighborhood.mockResolvedValue({ name: "Nasimi", nearbyPlaces: [{ name: "28 May Metro", category: "transport", sourceName: "City dataset" }] });
    server.getNeighborhoodProperties.mockResolvedValue([summary({ slug: "flat-1" }), summary({ slug: "other", title: "Other flat", askingPrice: 99000 })]);
    render(await PropertyPage({ params: Promise.resolve({ slug: "flat-1" }), searchParams: Promise.resolve({}) }));
    expect(screen.getByText("28 May Metro")).toBeInTheDocument();
    expect(screen.getByText(/source: City dataset/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Other flat/ })).toHaveAttribute("href", "/properties/other");
    expect(screen.queryByRole("link", { name: /Sunny flat/ })).not.toBeInTheDocument();
  });

  it("omits context sections when there is nothing real to show", async () => {
    server.getProperty.mockResolvedValue(detail());
    render(await PropertyPage({ params: Promise.resolve({ slug: "flat-1" }), searchParams: Promise.resolve({}) }));
    expect(screen.queryByText(/Nearby places/)).not.toBeInTheDocument();
    expect(screen.queryByText(/More apartment listings/)).not.toBeInTheDocument();
  });

  it("triggers the not-found (unavailable) state for unpublished or unknown slugs", async () => {
    server.getProperty.mockResolvedValue(null);
    await expect(PropertyPage({ params: Promise.resolve({ slug: "gone" }), searchParams: Promise.resolve({}) })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("ignores a hostile 'from' value rather than echoing it", async () => {
    server.getProperty.mockResolvedValue(detail());
    render(await PropertyPage({ params: Promise.resolve({ slug: "flat-1" }), searchParams: Promise.resolve({ from: "x\"><script>alert(1)</script>" }) }));
    expect(screen.getByRole("link", { name: /Back to the map/ })).toHaveAttribute("href", "/explore?sel=flat-1");
  });
});

describe("inquiry form", () => {
  it("validates before sending", async () => {
    wrap(<InquiryForm listingId="l-1" title="Sunny flat" />);
    await userEvent.clear(screen.getByLabelText("Your name"));
    await userEvent.type(screen.getByLabelText("Email"), "nope");
    await userEvent.clear(screen.getByLabelText("Message"));
    await userEvent.type(screen.getByLabelText("Message"), "short");
    await userEvent.click(screen.getByRole("button", { name: "Send inquiry" }));
    expect(await screen.findByText("Please enter your name")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid email address")).toBeInTheDocument();
    expect(screen.getByText(/at least 10 characters/)).toBeInTheDocument();
    expect(api.postInquiry).not.toHaveBeenCalled();
  });

  it("posts to the backend and confirms success", async () => {
    api.postInquiry.mockResolvedValue({ status: "received" });
    wrap(<InquiryForm listingId="l-1" title="Sunny flat" />);
    await userEvent.type(screen.getByLabelText("Your name"), "Ann");
    await userEvent.type(screen.getByLabelText("Email"), "ann@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Send inquiry" }));
    expect(await screen.findByText("Inquiry sent")).toBeInTheDocument();
    expect(api.postInquiry).toHaveBeenCalledWith(expect.objectContaining({ listingId: "l-1", name: "Ann", email: "ann@example.com", website: "" }));
  });

  it("does not claim success when the backend refuses", async () => {
    api.postInquiry.mockRejectedValue(new ApiError(429, { message: "slow down" }, "x"));
    wrap(<InquiryForm listingId="l-1" title="Sunny flat" />);
    await userEvent.type(screen.getByLabelText("Your name"), "Ann");
    await userEvent.type(screen.getByLabelText("Email"), "ann@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Send inquiry" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Too many inquiries/);
    expect(screen.queryByText("Inquiry sent")).not.toBeInTheDocument();
  });
});

describe("saved properties page", () => {
  it("explains the empty state", () => {
    wrap(<SavedApp />);
    expect(screen.getByText("Nothing saved yet")).toBeInTheDocument();
  });

  it("lists saved properties, handles unavailable ones, removes, and compares", async () => {
    window.localStorage.setItem("investin.saved.v1", JSON.stringify(["a", "b", "gone"]));
    api.fetchProperty.mockImplementation(async (slug: string) => {
      if (slug === "gone") throw new ApiError(404, { message: "nf" }, "nf");
      return detail({ slug, title: slug === "a" ? "Flat A" : "Flat B", askingPrice: slug === "a" ? 100000 : 250000, bedrooms: slug === "a" ? 2 : null });
    });
    wrap(<SavedApp />);
    expect(await screen.findByText("Flat A")).toBeInTheDocument();
    expect(await screen.findByText("No longer available")).toBeInTheDocument();

    const compareBoxes = screen.getAllByRole("checkbox", { name: "Compare" });
    await userEvent.click(compareBoxes[0]);
    await userEvent.click(compareBoxes[1]);
    await userEvent.click(screen.getByRole("button", { name: /Compare \(2\)/ }));
    const table = await screen.findByRole("table");
    expect(within(table).getByText("$100,000 (USD)")).toBeInTheDocument();
    expect(within(table).getByText("$250,000 (USD)")).toBeInTheDocument();
    // bedrooms unknown for B must read as "Not stated", not 0
    const bedsRow = within(table).getByRole("row", { name: /Bedrooms/ });
    expect(within(bedsRow).getByText("Not stated")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Remove from saved" }));
    await waitFor(() => expect(screen.queryByText("No longer available")).not.toBeInTheDocument());
    expect(JSON.parse(window.localStorage.getItem("investin.saved.v1")!)).toEqual(["a", "b"]);
  });

  it("limits comparison to four properties", async () => {
    window.localStorage.setItem("investin.saved.v1", JSON.stringify(["a", "b", "c", "d", "e"]));
    api.fetchProperty.mockImplementation(async (slug: string) => detail({ slug, title: `Flat ${slug}` }));
    wrap(<SavedApp />);
    await screen.findByText("Flat a");
    const boxes = screen.getAllByRole("checkbox", { name: "Compare" });
    for (const b of boxes.slice(0, 4)) await userEvent.click(b);
    expect(boxes[4]).toBeDisabled();
  });
});

describe("comparison table", () => {
  it("derives price per m² only when an area is stated and flags rows that differ", async () => {
    window.localStorage.setItem("investin.saved.v1", JSON.stringify(["a", "b"]));
    api.fetchProperty.mockImplementation(async (slug: string) =>
      detail({ slug, title: `Flat ${slug}`, askingPrice: slug === "a" ? 100000 : 150000, areaSqm: slug === "a" ? 50 : null, bedrooms: 2, currency: "USD" }));
    wrap(<SavedApp />);
    await screen.findByText("Flat a");
    const boxes = screen.getAllByRole("checkbox", { name: "Compare" });
    await userEvent.click(boxes[0]);
    await userEvent.click(boxes[1]);
    await userEvent.click(screen.getByRole("button", { name: /Compare \(2\)/ }));
    const table = await screen.findByRole("table");
    const ppm = within(table).getByRole("row", { name: /Price per m²/ });
    expect(within(ppm).getByText("$2,000 / m²")).toBeInTheDocument();
    expect(within(ppm).getByText("Not stated")).toBeInTheDocument(); // no area → no invented figure
    expect(within(within(table).getByRole("row", { name: /Bedrooms/ })).queryByText("differs")).not.toBeInTheDocument();
    expect(within(within(table).getByRole("row", { name: /Asking price/ })).getByText("differs")).toBeInTheDocument();
  });
});
