import { expect, type Page } from "@playwright/test";

/** Waits until the map has reported its viewport and results are on screen. */
export async function openExplore(page: Page, query = "") {
  await page.goto(`/explore${query}`);
  await expect(page.getByTestId("property-card").first()).toBeVisible();
  await page.waitForFunction(() => !!(window as unknown as { __investinMap?: unknown }).__investinMap);
}

/** Click a marker on the WebGL canvas by projecting its coordinates to screen pixels. */
export async function clickMarker(page: Page, lng: number, lat: number) {
  const pt = await page.evaluate(([x, y]) => {
    const map = (window as unknown as { __investinMap: { project(c: [number, number]): { x: number; y: number }; getContainer(): HTMLElement } }).__investinMap;
    const p = map.project([x, y]);
    const r = map.getContainer().getBoundingClientRect();
    return { x: r.left + p.x, y: r.top + p.y };
  }, [lng, lat]);
  await page.mouse.click(pt.x, pt.y);
}

export async function zoomTo(page: Page, lng: number, lat: number, zoom: number) {
  await page.evaluate(([x, y, z]) => {
    const map = (window as unknown as { __investinMap: { jumpTo(o: object): void } }).__investinMap;
    map.jumpTo({ center: [x, y], zoom: z });
  }, [lng, lat, zoom]);
}
