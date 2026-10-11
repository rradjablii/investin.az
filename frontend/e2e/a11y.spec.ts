import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openExplore } from "./helpers";

const API = process.env.BACKEND_URL ?? "http://localhost:8080";

async function scan(page: import("@playwright/test").Page) {
  // The third-party map canvas/attribution is out of scope; everything we render is in scope.
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).exclude(".maplibregl-map").analyze();
  return results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
}

test("explore page has no detectable WCAG A/AA violations", async ({ page }) => {
  await openExplore(page);
  expect(await scan(page)).toEqual([]);
});

test("filter dialog has no detectable violations", async ({ page }) => {
  await openExplore(page);
  await page.getByRole("button", { name: /Filters/ }).click();
  expect(await scan(page)).toEqual([]);
});

for (const path of ["/neighborhoods", "/neighborhoods/sabail", "/about", "/saved", "/admin/login"]) {
  test(`${path} has no detectable violations`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    expect(await scan(page)).toEqual([]);
  });
}

test("property detail has no detectable violations", async ({ page }) => {
  const slug = (await (await page.request.get(`${API}/api/v1/properties?size=1`)).json()).items[0].slug;
  await page.goto(`/properties/${slug}`);
  await page.waitForLoadState("networkidle");
  expect(await scan(page)).toEqual([]);
});
