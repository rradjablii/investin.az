import { expect, test } from "@playwright/test";

const API = process.env.BACKEND_URL ?? "http://localhost:8080";
const EMAIL = process.env.E2E_ADMIN_EMAIL;
const PASSWORD = process.env.E2E_ADMIN_PASSWORD;

// 1x1 transparent PNG
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

test("an unauthorized visitor cannot reach or use admin functions", async ({ page, request }) => {
  await page.goto("/admin/listings");
  await expect(page).toHaveURL(/\/admin\/login/);

  const list = await request.get(`${API}/api/v1/properties?size=1`);
  const { listingId } = (await list.json()).items[0];
  const publish = await request.post(`${API}/api/v1/admin/listings/${listingId}/publish`);
  expect([401, 403]).toContain(publish.status());
  const read = await request.get(`${API}/api/v1/admin/listings`);
  expect(read.status()).toBe(401);
});

test.describe("administrator", () => {
  test.skip(!EMAIL || !PASSWORD, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run admin journeys");

  test("signs in, creates a listing, and publishes it", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(EMAIL!);
    await page.getByLabel("Password").fill(PASSWORD!);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin$/);

    // a source with granted permission is required before anything can go public
    const sourceName = `E2E agency ${Date.now()}`;
    await page.getByPlaceholder("Source name").fill(sourceName);
    await page.getByLabel("Permission status").selectOption("granted");
    await page.getByRole("button", { name: "Add source" }).click();
    await expect(page.getByText(sourceName)).toBeVisible();

    await page.goto("/admin/listings/new");
    const title = `E2E flat ${Date.now()}`;
    await page.getByLabel("Title").fill(title);
    await page.getByLabel(/^Description/).fill("A listing created by the end-to-end test suite.");
    await page.getByLabel(/^Asking price/).fill("123456");
    await page.getByLabel(/^Floor area/).fill("64");
    await page.getByLabel("Neighborhood").selectOption("nasimi");
    await page.getByLabel("Data source").selectOption({ label: `${sourceName} (granted)` });
    await page.getByLabel("Last checked against source").fill(new Date().toISOString().slice(0, 10));
    await page.getByRole("button", { name: "Create draft" }).click();
    await expect(page).toHaveURL(/\/edit$/);

    // publishing before an image exists is refused by the server
    await page.getByRole("button", { name: "Submit for review" }).click();
    await expect(page.getByRole("button", { name: "Publish" })).toBeVisible();
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /image/i })).toBeVisible();

    await page.getByLabel("Image file").setInputFiles({ name: "front.png", mimeType: "image/png", buffer: PNG });
    await page.getByLabel("Alt text").fill("Front of the building");
    await page.getByLabel("Rights reference").fill("Own photograph, E2E suite");
    await page.getByRole("button", { name: "Upload image" }).click();
    await expect(page.getByText("Rights: Own photograph, E2E suite")).toBeVisible();

    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText("Updated.")).toBeVisible();
    const link = page.getByRole("link", { name: "View public page" });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.getByText("$123,456").first()).toBeVisible();
  });
});
