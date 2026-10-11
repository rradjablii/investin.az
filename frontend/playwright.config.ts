import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;
const webgl = { args: ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"] };

/**
 * End-to-end tests need the real stack: PostgreSQL/PostGIS + the Spring Boot backend (dev profile, with the fictional
 * demo data) listening on BACKEND_URL (default http://localhost:8080). The frontend is built and started for you.
 * Admin journeys additionally need E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD (an existing administrator).
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: BASE_URL, trace: "retain-on-failure", launchOptions: webgl },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], launchOptions: webgl }, testIgnore: /mobile\.spec\.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"], launchOptions: webgl }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `NEXT_PUBLIC_E2E=1 npm run build && npx next start -p ${PORT}`,
        url: `${BASE_URL}/about`,
        timeout: 240_000,
        reuseExistingServer: false,
        env: { BACKEND_URL: process.env.BACKEND_URL ?? "http://localhost:8080" },
      },
});
