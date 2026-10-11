/* eslint-disable @next/next/no-location-assign-relative-destination -- full page load on purpose so server components re-check the session cookie */
import { ApiError, apiFetch } from "./api";

let csrf: { header: string; token: string } | null = null;

async function csrfToken(force = false) {
  if (!csrf || force) {
    const r = await apiFetch<{ headerName: string; token: string }>("/api/v1/admin/auth/csrf", { credentials: "same-origin" });
    csrf = { header: r.headerName, token: r.token };
  }
  return csrf;
}

/** Same-origin cookie session + CSRF header for every mutation. Redirects to login on 401. */
export async function adminFetch<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers: Record<string, string> = { ...(init.headers as Record<string, string> | undefined) };
  let body = init.body;
  if (init.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.json);
  }
  const attempt = async (forceToken: boolean) => {
    if (method !== "GET") {
      const t = await csrfToken(forceToken);
      headers[t.header] = t.token;
    }
    return apiFetch<T>(path, { ...init, method, headers, body, credentials: "same-origin" });
  };
  try {
    try {
      return await attempt(false);
    } catch (e) {
      // A stale CSRF token (session rotated) shows up as 403 once; refresh and retry exactly once.
      if (e instanceof ApiError && e.status === 403 && method !== "GET") return await attempt(true);
      throw e;
    }
  } catch (e) {
    if (e instanceof ApiError && e.status === 401 && typeof window !== "undefined" && !path.includes("/auth/")) {
      window.location.assign("/admin/login");
    }
    throw e;
  }
}

export async function adminLogin(email: string, password: string) {
  const t = await csrfToken(true);
  const r = await apiFetch<{ email: string; role: string }>("/api/v1/admin/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", [t.header]: t.token },
    body: JSON.stringify({ email, password }),
    credentials: "same-origin",
  });
  csrf = null; // the session changed; fetch a fresh token next time
  return r;
}

export async function adminLogout() {
  await adminFetch<void>("/api/v1/admin/auth/logout", { method: "POST" });
  csrf = null;
}
