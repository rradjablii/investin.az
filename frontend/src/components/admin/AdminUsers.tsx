"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/admin-api";
import { ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { PrimaryButton, SecondaryButton, Spinner } from "@/components/ui/StateMessage";

interface User { id: string; email: string; role: string; enabled: boolean; createdAt: string }

const msg = (e: unknown) => (e instanceof ApiError ? [e.message, ...e.details].join(" — ") : "Something went wrong");

export default function AdminUsers() {
  const qc = useQueryClient();
  const users = useQuery({ queryKey: ["admin", "users"], queryFn: () => adminFetch<User[]>("/api/v1/admin/users") });
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const done = (text: string) => { setNotice({ ok: true, text }); qc.invalidateQueries({ queryKey: ["admin", "users"] }); };
  const fail = (e: unknown) => setNotice({ ok: false, text: msg(e) });

  const create = useMutation({ mutationFn: (json: unknown) => adminFetch<User>("/api/v1/admin/users", { method: "POST", json }), onSuccess: () => done("User created."), onError: fail });
  const update = useMutation({ mutationFn: (v: { id: string; json: unknown }) => adminFetch<User>(`/api/v1/admin/users/${v.id}`, { method: "PATCH", json: v.json }), onSuccess: () => done("User updated."), onError: fail });
  const reset = useMutation({ mutationFn: (v: { id: string; password: string }) => adminFetch<void>(`/api/v1/admin/users/${v.id}/password`, { method: "POST", json: { password: v.password } }), onSuccess: () => done("Password reset."), onError: fail });
  const change = useMutation({ mutationFn: (json: unknown) => adminFetch<void>("/api/v1/admin/auth/change-password", { method: "POST", json }), onSuccess: () => done("Your password was changed."), onError: fail });
  const field = "h-9 rounded border border-line-2 px-2 text-sm";

  if (users.isPending) return <Spinner />;
  if (users.isError) return <p role="alert" className="text-danger">{users.error instanceof ApiError && users.error.status === 403 ? "Only administrators can manage users." : "Couldn't load users."}</p>;

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">Administrator accounts</h1>
      {notice && <p role={notice.ok ? "status" : "alert"} className={`rounded-md p-2 text-sm ${notice.ok ? "bg-accent-soft text-accent" : "bg-danger-soft text-danger"}`}>{notice.text}</p>}

      <ul className="divide-y divide-line rounded-lg border border-line bg-surface text-sm">
        {users.data.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-3 p-3">
            <span className="min-w-48 font-medium">{u.email}{!u.enabled && <span className="ml-2 rounded bg-line px-1.5 text-xs text-ink-2">disabled</span>}</span>
            <span className="text-xs text-ink-3">since {formatDate(u.createdAt)}</span>
            <label className="ml-auto text-xs text-ink-3">Role{" "}
              <select aria-label={`Role of ${u.email}`} value={u.role} className={field} onChange={(e) => update.mutate({ id: u.id, json: { role: e.target.value } })}>
                <option>ADMIN</option><option>EDITOR</option>
              </select>
            </label>
            <SecondaryButton onClick={() => update.mutate({ id: u.id, json: { enabled: !u.enabled } })}>{u.enabled ? "Disable" : "Enable"}</SecondaryButton>
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const f = e.currentTarget; reset.mutate({ id: u.id, password: String(new FormData(f).get("pw")) }); f.reset(); }}>
              <input name="pw" type="password" minLength={12} required autoComplete="new-password" placeholder="New password" aria-label={`New password for ${u.email}`} className={field} />
              <SecondaryButton type="submit">Reset password</SecondaryButton>
            </form>
          </li>
        ))}
      </ul>

      <section aria-labelledby="nu" className="rounded-lg border border-line bg-surface p-4">
        <h2 id="nu" className="text-lg font-semibold">Add a user</h2>
        <form className="mt-3 grid gap-2 sm:grid-cols-4" onSubmit={(e) => { e.preventDefault(); const f = e.currentTarget; const d = new FormData(f); create.mutate({ email: d.get("email"), password: d.get("password"), role: d.get("role") }); f.reset(); }}>
          <input name="email" type="email" required placeholder="Email" aria-label="Email" className={field} />
          <input name="password" type="password" minLength={12} required autoComplete="new-password" placeholder="Password (12+ characters)" aria-label="Password" className={field} />
          <select name="role" aria-label="Role" className={field}><option>EDITOR</option><option>ADMIN</option></select>
          <PrimaryButton type="submit" disabled={create.isPending}>Create user</PrimaryButton>
        </form>
        <p className="mt-2 text-xs text-ink-3">Editors can draft and submit listings for review; only administrators publish, archive, manage sources and users. Role changes and disabling take effect immediately, ending the person&apos;s current session.</p>
      </section>

      <section aria-labelledby="cp" className="rounded-lg border border-line bg-surface p-4">
        <h2 id="cp" className="text-lg font-semibold">Change your password</h2>
        <form className="mt-3 grid gap-2 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); const f = e.currentTarget; const d = new FormData(f); change.mutate({ currentPassword: d.get("current"), newPassword: d.get("next") }); f.reset(); }}>
          <input name="current" type="password" required autoComplete="current-password" placeholder="Current password" aria-label="Current password" className={field} />
          <input name="next" type="password" minLength={12} required autoComplete="new-password" placeholder="New password (12+ characters)" aria-label="New password" className={field} />
          <PrimaryButton type="submit" disabled={change.isPending}>Change password</PrimaryButton>
        </form>
      </section>
    </div>
  );
}
