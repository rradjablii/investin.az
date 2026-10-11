import { expect, test } from "@playwright/test";

test("mobile: map first, switch to list and back, no horizontal overflow", async ({ page }) => {
  await page.goto("/explore");
  await page.waitForFunction(() => !!(window as unknown as { __investinMap?: unknown }).__investinMap);
  await expect(page.getByTestId("map")).toBeVisible();
  await expect(page.getByRole("button", { name: /^List/ })).toBeVisible();
  // the results panel is not shown while the map is
  await expect(page.getByTestId("property-card").first()).toBeHidden();

  await page.getByRole("button", { name: /^List/ }).click();
  await expect(page.getByTestId("property-card").first()).toBeVisible();
  await expect(page.getByTestId("map")).toBeHidden();

  // select a card, return to the map: the selection preview is there and the viewport is unchanged
  const before = new URL(page.url()).searchParams.get("lat");
  await page.getByTestId("property-card").first().getByRole("button", { name: /Select/ }).click();
  await page.getByRole("button", { name: "Map" }).click();
  await expect(page.getByTestId("selected-preview")).toBeVisible();
  expect(new URL(page.url()).searchParams.get("lat")).toBe(before);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});

test("mobile: filters need an explicit Apply", async ({ page }) => {
  await page.goto("/explore");
  await page.waitForFunction(() => !!(window as unknown as { __investinMap?: unknown }).__investinMap);
  await page.getByRole("button", { name: /^List/ }).click();
  await expect(page.getByTestId("property-card").first()).toBeVisible();
  const count = await page.getByTestId("result-count").textContent();
  await page.getByRole("button", { name: /Filters/ }).click();
  await page.getByRole("dialog").getByText("House", { exact: true }).click();
  // not applied yet
  expect(await page.getByTestId("result-count").textContent()).toBe(count);
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/type=house/);
});
