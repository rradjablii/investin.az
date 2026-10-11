import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MapViewProps } from "@/components/explore/mapTypes";
import { resetSavedStoreForTests } from "@/lib/saved";
import { marker, summary } from "./fixtures";

// ---- fake map: exposes markers as buttons and lets tests drive the callbacks MapLibre would call ----
let mapProps: MapViewProps | null = null;
vi.mock("@/components/explore/MapViewLoader", () => ({
  default: function FakeMap(props: MapViewProps) {
    mapProps = props;
    return (
      <div data-testid="fake-map">
        {props.markers.map((m) => (
          <button key={m.slug} data-testid={`marker-${m.slug}`} aria-pressed={props.selectedSlug === m.slug} onClick={() => props.onSelect(m.slug)}>
            marker {m.slug}
          </button>
        ))}
      </div>
    );
  },
}));

const api = vi.hoisted(() => ({
  fetchMarkers: vi.fn(), fetchProperties: vi.fn(), fetchNeighborhoods: vi.fn(), fetchSuggestions: vi.fn(), fetchProperty: vi.fn(),
}));
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), ...api }));

import ExploreApp from "@/components/explore/ExploreApp";

const A = summary({ slug: "a", title: "Flat A", askingPrice: 100000 });
const B = summary({ slug: "b", title: "Flat B", askingPrice: 200000, latitude: 40.41 });
const BOUNDS = { west: 49.7, south: 40.3, east: 50.1, north: 40.5 };

function respond(items = [A, B]) {
  api.fetchMarkers.mockResolvedValue({ markers: items.map(marker), total: items.length, truncated: false });
  api.fetchProperties.mockResolvedValue({ items, total: items.length, page: 0, size: 24 });
}

function renderApp() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}><ExploreApp /></QueryClientProvider>);
}

/** What MapLibre does after load/move: report the viewport. */
async function mapSettles() {
  await waitFor(() => expect(mapProps).not.toBeNull());
  act(() => mapProps!.onViewChange({ lat: 40.4, lng: 49.9, zoom: 12 }, BOUNDS));
}

beforeEach(() => {
  vi.clearAllMocks();
  mapProps = null;
  resetSavedStoreForTests();
  api.fetchNeighborhoods.mockResolvedValue([{ slug: "nasimi", name: "Nasimi", description: null, centerLatitude: 40.4, centerLongitude: 49.8, listingCount: 2 }]);
  api.fetchSuggestions.mockResolvedValue([]);
  api.fetchProperty.mockRejectedValue(new Error("not found"));
  window.history.replaceState(null, "", "/explore");
  respond();
});

describe("Explore: data loading", () => {
  it("waits for the map viewport, then queries with those bounds", async () => {
    renderApp();
    expect(api.fetchProperties).not.toHaveBeenCalled();
    await mapSettles();
    expect(await screen.findByText("Flat A")).toBeInTheDocument();
    expect(api.fetchProperties.mock.calls[0][1]).toMatchObject(BOUNDS);
    expect(api.fetchMarkers.mock.calls[0][1]).toMatchObject(BOUNDS);
    expect(screen.getByTestId("result-count")).toHaveTextContent("2 properties in this area");
  });

  it("writes the settled viewport into the URL", async () => {
    renderApp();
    await mapSettles();
    await waitFor(() => expect(window.location.search).toContain("lat=40.4000"));
    expect(window.location.search).toContain("z=12.00");
  });

  it("shows an empty state with a reset action when filters match nothing", async () => {
    respond([]);
    window.history.replaceState(null, "", "/explore?type=house");
    renderApp();
    await mapSettles();
    expect(await screen.findByText("No properties match here")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reset all filters" }));
    await waitFor(() => expect(window.location.search).not.toContain("type=house"));
  });

  it("shows an error state and recovers on retry", async () => {
    api.fetchProperties.mockRejectedValueOnce(new Error("Backend exploded"));
    renderApp();
    await mapSettles();
    expect(await screen.findByText("We couldn't load properties")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Backend exploded");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Flat A")).toBeInTheDocument();
  });
});

describe("Explore: marker and card synchronisation", () => {
  it("selecting a marker highlights its card and shows the preview", async () => {
    renderApp();
    await mapSettles();
    await screen.findByText("Flat A");
    await userEvent.click(screen.getByTestId("marker-b"));
    const card = document.querySelector('[data-slug="b"]') as HTMLElement;
    await waitFor(() => expect(card).toHaveAttribute("data-selected", "true"));
    expect(document.querySelector('[data-slug="a"]')).toHaveAttribute("data-selected", "false");
    expect(within(screen.getByTestId("selected-preview")).getByText("$200,000")).toBeInTheDocument();
    expect(window.location.search).toContain("sel=b");
  });

  it("selecting a card highlights its marker", async () => {
    renderApp();
    await mapSettles();
    await screen.findByText("Flat A");
    await userEvent.click(within(document.querySelector('[data-slug="a"]') as HTMLElement).getByRole("button", { name: /Select Flat A/ }));
    await waitFor(() => expect(screen.getByTestId("marker-a")).toHaveAttribute("aria-pressed", "true"));
    expect(screen.getByTestId("marker-b")).toHaveAttribute("aria-pressed", "false");
  });

  it("closing the preview deselects both", async () => {
    renderApp();
    await mapSettles();
    await screen.findByText("Flat A");
    await userEvent.click(screen.getByTestId("marker-a"));
    await userEvent.click(await screen.findByRole("button", { name: "Close preview" }));
    await waitFor(() => expect(screen.getByTestId("marker-a")).toHaveAttribute("aria-pressed", "false"));
    expect(window.location.search).not.toContain("sel=");
  });

  it("restores a selection from a shared URL even when it is not in the current results", async () => {
    api.fetchProperty.mockResolvedValue({ ...A, slug: "far", title: "Far flat", images: [] });
    window.history.replaceState(null, "", "/explore?sel=far");
    renderApp();
    await mapSettles();
    expect(await screen.findByTestId("selected-preview")).toHaveTextContent("Far flat");
  });
});

describe("Explore: filters and URL state", () => {
  it("applies filters from the sheet to the request and the URL, with a removable chip", async () => {
    renderApp();
    await mapSettles();
    await screen.findByText("Flat A");
    await userEvent.click(screen.getByRole("button", { name: /Filters/ }));
    await userEvent.click(screen.getByLabelText(/House/));
    await userEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    await waitFor(() => expect(api.fetchProperties.mock.calls.at(-1)![0]).toMatchObject({ type: ["house"] }));
    expect(window.location.search).toContain("type=house");
    // bounds are preserved
    expect(api.fetchProperties.mock.calls.at(-1)![1]).toMatchObject(BOUNDS);
    const chips = screen.getByRole("list", { name: "Active filters" });
    await userEvent.click(within(chips).getByRole("button", { name: "Remove filter House" }));
    await waitFor(() => expect(window.location.search).not.toContain("type=house"));
    expect(screen.queryByRole("list", { name: "Active filters" })).not.toBeInTheDocument();
  });

  it("restores supported filters from a shared URL", async () => {
    window.history.replaceState(null, "", "/explore?type=apartment&currency=USD&minPrice=50000&maxPrice=150000&minBedrooms=2");
    renderApp();
    await mapSettles();
    await waitFor(() => expect(api.fetchProperties).toHaveBeenCalled());
    expect(api.fetchProperties.mock.calls[0][0]).toMatchObject({ type: ["apartment"], currency: "USD", minPrice: 50000, maxPrice: 150000, minBedrooms: 2 });
    const chips = screen.getByRole("list", { name: "Active filters" });
    expect(within(chips).getByText("Apartment")).toBeInTheDocument();
    expect(within(chips).getByText("USD 50K–150K")).toBeInTheDocument();
    expect(within(chips).getByText("2+ bd")).toBeInTheDocument();
  });

  it("restores filters on browser back and forward", async () => {
    renderApp();
    await mapSettles();
    await screen.findByText("Flat A");
    await userEvent.click(screen.getByRole("button", { name: /Filters/ }));
    await userEvent.click(screen.getByLabelText(/Land/));
    await userEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    await screen.findByRole("list", { name: "Active filters" });
    act(() => window.history.back());
    await waitFor(() => expect(screen.queryByRole("list", { name: "Active filters" })).not.toBeInTheDocument());
    act(() => window.history.forward());
    expect(await screen.findByRole("list", { name: "Active filters" })).toBeInTheDocument();
  });

  it("disables price sorting until a currency is chosen", async () => {
    renderApp();
    await mapSettles();
    await screen.findByText("Flat A");
    const sort = screen.getByRole("combobox", { name: "Sort results" });
    expect(within(sort).getByRole("option", { name: /Price: low to high/ })).toBeDisabled();
  });

  it("never lets an obsolete response overwrite a newer one", async () => {
    let releaseSlow: (v: unknown) => void = () => {};
    const slow = new Promise((r) => { releaseSlow = r; });
    renderApp();
    await mapSettles();
    await screen.findByText("Flat A");

    const fast = summary({ slug: "fast", title: "Fast result" });
    api.fetchProperties.mockImplementation((f: { type: string[] }) =>
      f.type.includes("house")
        ? slow
        : Promise.resolve({ items: [fast], total: 1, page: 0, size: 24 }));
    api.fetchMarkers.mockResolvedValue({ markers: [], total: 0, truncated: false });

    // 1) slow request for houses
    await userEvent.click(screen.getByRole("button", { name: /Filters/ }));
    await userEvent.click(screen.getByLabelText(/House/));
    await userEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    // 2) before it returns, the user switches to land (fast)
    await userEvent.click(screen.getByRole("button", { name: /Filters/ }));
    const dialog = screen.getByRole("dialog");
    await userEvent.click(within(dialog).getByLabelText(/House/)); // un-tick
    await userEvent.click(within(dialog).getByLabelText(/Land/));
    await userEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(await screen.findByText("Fast result")).toBeInTheDocument();
    // 3) the stale response finally arrives
    await act(async () => releaseSlow({ items: [summary({ slug: "stale", title: "Stale result" })], total: 1, page: 0, size: 24 }));
    expect(screen.queryByText("Stale result")).not.toBeInTheDocument();
    expect(screen.getByText("Fast result")).toBeInTheDocument();
  });
});

describe("Explore: mobile and map failure", () => {
  it("switches between map and list and keeps the choice in the URL", async () => {
    renderApp();
    await mapSettles();
    await screen.findByText("Flat A");
    await userEvent.click(screen.getByRole("button", { name: /List/ }));
    await waitFor(() => expect(window.location.search).toContain("v=list"));
    expect(screen.getByRole("button", { name: "Map" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Map" }));
    await waitFor(() => expect(window.location.search).not.toContain("v=list"));
  });

  it("keeps listing properties when the map fails to load", async () => {
    renderApp();
    await waitFor(() => expect(mapProps).not.toBeNull());
    act(() => mapProps!.onError("Style could not be loaded", true));
    expect(await screen.findByText("The map couldn't be displayed")).toBeInTheDocument();
    expect(await screen.findByText("Flat A")).toBeInTheDocument();
    // without a map there are no bounds: the request must not carry any
    expect(api.fetchProperties.mock.calls[0][1]).toBeNull();
    expect(screen.getByTestId("result-count")).not.toHaveTextContent("in this area");
  });

  it("builds detail links that remember the map state", async () => {
    renderApp();
    await mapSettles();
    await screen.findByText("Flat A");
    await waitFor(() => expect(window.location.search).toContain("lat="));
    const link = screen.getAllByRole("link", { name: /View details for Flat A/ })[0];
    const href = link.getAttribute("href")!;
    expect(href).toMatch(/^\/properties\/a\?from=/);
    expect(decodeURIComponent(href.split("from=")[1])).toContain("lat=40.4000");
  });
});
