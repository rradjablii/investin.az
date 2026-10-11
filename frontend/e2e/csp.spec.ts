import { expect, test } from "@playwright/test";
import { openExplore } from "./helpers";

test("a strict nonce-based CSP is sent and nothing we ship violates it", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", (m) => { if (/Content Security Policy|Refused to/i.test(m.text())) violations.push(m.text().slice(0, 200)); });
  const res = await page.goto("/explore");
  const csp = res!.headers()["content-security-policy"];
  expect(csp).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("frame-ancestors 'none'");
  await openExplore(page); // map, workers, tiles all load under the policy
  const slug = (await (await page.request.get(`${process.env.BACKEND_URL ?? "http://localhost:8080"}/api/v1/properties?size=1`)).json()).items[0].slug;
  await page.goto(`/properties/${slug}`);
  await page.waitForLoadState("networkidle");
  await page.goto("/admin/login");
  expect(violations).toEqual([]);
});
