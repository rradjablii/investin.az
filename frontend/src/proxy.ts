import { NextResponse, type NextRequest } from "next/server";

/** Origins the map may talk to (style, tiles, glyphs, sprites). The style URL's origin is always allowed. */
function mapOrigins(): string {
  const origins = new Set<string>();
  try {
    origins.add(new URL(process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? "https://tiles.openfreemap.org/styles/positron").origin);
  } catch {
    /* invalid URL: map will fail visibly, nothing to allow */
  }
  // Extra tile/glyph hosts when the chosen provider serves them from other origins.
  (process.env.CSP_MAP_ORIGINS ?? "").split(/\s+/).filter(Boolean).forEach((o) => origins.add(o));
  return [...origins].join(" ");
}

/** Strict, nonce-based CSP: only our own scripts (and what they load) run. */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const dev = process.env.NODE_ENV === "development";
  const map = mapOrigins();
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    // Inline styles are still allowed: MapLibre and React set element styles. Scripts are the XSS-critical part.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${map}`,
    `connect-src 'self' ${map}`,
    "worker-src 'self' blob:",
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [{ source: "/((?!api|_next/static|_next/image|maplibre|favicon.ico).*)", missing: [{ type: "header", key: "next-router-prefetch" }, { type: "header", key: "purpose", value: "prefetch" }] }],
};
