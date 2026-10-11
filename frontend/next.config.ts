import type { NextConfig } from "next";

// Browser requests to /api/* are proxied to the Spring Boot backend, so the browser only ever talks to one
// origin (no CORS, and the admin session cookie stays first-party).
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  poweredByHeader: false,
  // The Docker image sets NEXT_OUTPUT=standalone; local `next start` stays the default.
  ...(process.env.NEXT_OUTPUT === "standalone" ? { output: "standalone" as const } : {}),
};

export default nextConfig;
