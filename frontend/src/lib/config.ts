/** Public (browser) configuration. All values come from environment variables. */
export const MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? "https://tiles.openfreemap.org/styles/positron";

/** Initial Baku view. */
export const DEFAULT_VIEW = { lat: 40.3953, lng: 49.8822, zoom: 11.2 };

/** Server-side only: where the Spring Boot API lives. */
export const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";
