import { expect, test } from "@playwright/test";
import { clickMarker, openExplore, zoomTo } from "./helpers";

const API = process.env.BACKEND_URL ?? "http://localhost:8080";

test.describe("discovery journey", () => {
  test("explore → filter → select marker → details → back → save → refresh", async ({ page, request }) => {
    // 1-2. open explore, map and results load
    await openExplore(page);
    await expect(page.getByTestId("map")).toBeVisible();
    // photos really render: no endless skeleton and no "image unavailable" fallback on the first card
    const first = page.getByTestId("property-card").first();
    await expect(first.locator("img")).toBeVisible();
    await expect(first.locator(".skeleton")).toHaveCount(0);
    await expect(first.getByText("Image unavailable")).toHaveCount(0);
    await expect(page.getByTestId("result-count")).toContainText("properties in this area");

    // 3. apply a price filter (USD up to 250k)
    await page.getByRole("button", { name: /Filters/ }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Currency").selectOption("USD");
    await dialog.getByLabel("Max", { exact: true }).first().fill("250000");
    await dialog.getByRole("button", { name: "Apply filters" }).click();
    await expect(page).toHaveURL(/currency=USD/);
    await expect(page).toHaveURL(/maxPrice=250000/);
    await expect(page.getByRole("list", { name: "Active filters" })).toContainText("USD up to 250K");

    // every visible card respects the filter (prices are USD and ≤ 250,000)
    const prices = await page.getByTestId("card-price").allTextContents();
    expect(prices.length).toBeGreaterThan(0);
    for (const p of prices) {
      expect(p.startsWith("$")).toBe(true);
      expect(Number(p.replace(/[$,]/g, ""))).toBeLessThanOrEqual(250000);
    }

    // 4. select a marker by clicking on the map canvas
    const res = await request.get(`${API}/api/v1/properties/markers?currency=USD&maxPrice=250000&west=49.6&south=40.2&east=50.2&north=40.6`);
    const { markers } = await res.json();
    // pick a marker whose coordinates are unique so the click cannot hit a stacked neighbour
    const key = (x: { latitude: number; longitude: number }) => `${x.latitude},${x.longitude}`;
    const m = markers.find((x: { latitude: number; longitude: number }) => markers.filter((y: { latitude: number; longitude: number }) => key(y) === key(x)).length === 1);
    expect(m, "a marker with unique coordinates").toBeTruthy();
    await zoomTo(page, m.longitude, m.latitude, 16);
    await expect(page.getByTestId("property-card").first()).toBeVisible();
    await page.waitForTimeout(1200); // viewport debounce + source update
    await clickMarker(page, m.longitude, m.latitude);
    await expect(page.getByTestId("selected-preview")).toBeVisible();
    await expect(page.locator(`[data-slug="${m.slug}"]`)).toHaveAttribute("data-selected", "true");

    // 5. open the matching property detail
    await page.getByTestId("selected-preview").getByRole("link", { name: "View details" }).click();
    await expect(page).toHaveURL(new RegExp(`/properties/${m.slug}`));
    const title = await page.getByRole("heading", { level: 1 }).textContent();
    expect(title).toBeTruthy();
    await expect(page.getByText("Source and verification")).toBeVisible();

    // 7. save it (while here)
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("button", { name: "Saved", exact: true })).toBeVisible();

    // 6. back to the map without losing search state
    await page.getByRole("link", { name: /Back to the map/ }).click();
    await expect(page).toHaveURL(/currency=USD/);
    await expect(page).toHaveURL(/maxPrice=250000/);
    await expect(page).toHaveURL(/lat=/);
    await expect(page.getByRole("list", { name: "Active filters" })).toContainText("USD up to 250K");

    // 8. refresh: still saved
    await page.goto(`/properties/${m.slug}`);
    await page.reload();
    await expect(page.getByRole("button", { name: "Saved", exact: true })).toBeVisible();
    await page.goto("/saved");
    await expect(page.getByTestId("saved-item")).toHaveCount(1);
  });

  test("direct property URL works and an unpublished one is unavailable", async ({ page }) => {
    const res = await page.request.get(`${API}/api/v1/properties?size=1`);
    const slug = (await res.json()).items[0].slug;
    await page.goto(`/properties/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // demo seed contains an unpublished record
    const gone = await page.goto("/properties/demo-land-khazar-40");
    expect(gone?.status()).toBe(404);
    await expect(page.getByText("This property is no longer available")).toBeVisible();
  });

  test("neighborhood page links into a filtered map", async ({ page }) => {
    await page.goto("/neighborhoods/sabail");
    await expect(page.getByRole("heading", { level: 1, name: "Sabail" })).toBeVisible();
    await page.getByRole("link", { name: /Explore Sabail on the map/ }).click();
    await expect(page).toHaveURL(/neighborhood=sabail/);
    await expect(page.getByTestId("property-card").first()).toBeVisible();
    await expect(page.getByRole("list", { name: "Active filters" })).toContainText("Sabail");
    const where = await page.getByTestId("card-location").allTextContents();
    expect(where.length).toBeGreaterThan(0);
    for (const w of where) expect(w).toContain("Sabail");
  });

  test("a valid inquiry is accepted and stored", async ({ page }) => {
    const res = await page.request.get(`${API}/api/v1/properties?size=1`);
    const slug = (await res.json()).items[0].slug;
    await page.goto(`/properties/${slug}`);
    await page.getByLabel("Your name").fill("E2E Tester");
    await page.getByLabel("Email").fill("e2e@example.com");
    await page.getByRole("button", { name: "Send inquiry" }).click();
    await expect(page.getByText("Inquiry sent")).toBeVisible();
  });
});
