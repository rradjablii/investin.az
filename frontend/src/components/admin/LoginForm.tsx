"use client";

/* eslint-disable @next/next/no-location-assign-relative-destination -- full page load on purpose so server components re-check the session cookie */

import { useState } from "react";
import { ApiError } from "@/lib/api";
import { adminLogin } from "@/lib/admin-api";
import { PrimaryButton } from "@/components/ui/StateMessage";

export default function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form className="mt-6 space-y-4" onSubmit={async (e) => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      setBusy(true); setError(null);
      try {
        await adminLogin(String(f.get("email")), String(f.get("password")));
        window.location.assign("/admin");
      } catch (err) {
        setError(err instanceof ApiError && err.status === 429 ? "Too many attempts. Try again in a few minutes."
          : err instanceof ApiError && err.status === 401 ? "Invalid email or password." : "Sign-in failed. Please try again.");
        setBusy(false);
      }
    }}>
      <label className="block text-sm font-medium">Email
        <input name="email" type="email" required autoComplete="username" className="mt-1 h-10 w-full rounded-md border border-line-2 px-3 font-normal" />
      </label>
      <label className="block text-sm font-medium">Password
        <input name="password" type="password" required autoComplete="current-password" className="mt-1 h-10 w-full rounded-md border border-line-2 px-3 font-normal" />
      </label>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <PrimaryButton type="submit" disabled={busy} className="w-full">{busy ? "Signing in…" : "Sign in"}</PrimaryButton>
    </form>
  );
}
