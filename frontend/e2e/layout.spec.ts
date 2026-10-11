import { expect, test } from "@playwright/test";

const sizes = [
  { name: "tablet", w: 768, h: 1024 },
  { name: "laptop", w: 1024, h: 768 },
  { name: "desktop", w: 1440, h: 900 },
];

for (const s of sizes) {
  test(`explore layout at ${s.name} (${s.w}px) has no horizontal overflow and a usable map`, async ({ page }) => {
    await page.setViewportSize({ width: s.w, height: s.h });
    await page.goto("/explore");
    await page.waitForFunction(() => !!(window as unknown as { __investinMap?: unknown }).__investinMap);
    await expect(page.getByTestId("property-card").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    const map = await page.getByTestId("map").boundingBox();
    expect(map!.width / s.w).toBeGreaterThan(s.w >= 1024 ? 0.55 : 0.45); // the map is the main surface
    expect(map!.height).toBeGreaterThan(s.h * 0.6);
    // filters never overflow: open the dialog and check it stays within the viewport
    await page.getByRole("button", { name: /Filters/ }).click();
    const box = await page.getByRole("dialog").boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(s.w);
  });
}

test("desktop: the results panel can be collapsed to give the map the full width", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/explore");
  await expect(page.getByTestId("property-card").first()).toBeVisible();
  await page.getByRole("button", { name: "Hide results" }).click();
  await expect(page.getByTestId("property-card").first()).toBeHidden();
  expect((await page.getByTestId("map").boundingBox())!.width).toBeGreaterThan(1400);
  await page.getByRole("button", { name: "Show results" }).click();
  await expect(page.getByTestId("property-card").first()).toBeVisible();
});

test("the reset-view control returns the map to Baku", async ({ page }) => {
  await page.goto("/explore?lat=40.2&lng=49.5&z=9");
  await page.waitForFunction(() => !!(window as unknown as { __investinMap?: unknown }).__investinMap);
  await page.getByRole("button", { name: "Reset map to Baku" }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __investinMap: { getZoom(): number } }).__investinMap.getZoom()), { timeout: 10000 }).toBeGreaterThan(10.5);
});
