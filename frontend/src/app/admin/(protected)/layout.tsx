import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminNav from "@/components/admin/AdminNav";
import { BACKEND_URL } from "@/lib/config";

export const metadata = { robots: { index: false, follow: false } };

/**
 * Server-side gate: the session cookie is verified with the backend on every render of this layout.
 * (The backend independently enforces authorization on every admin API call — this is not the only line of defence.)
 */
export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const cookieHeader = (await cookies()).toString();
  let me: { email: string; role: string } | null = null;
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/admin/auth/me`, { headers: { cookie: cookieHeader }, cache: "no-store" });
    if (res.ok) me = await res.json();
  } catch {
    /* backend unreachable: treat as signed out */
  }
  if (!me) redirect("/admin/login");
  return (
    <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
      <AdminNav email={me.email} role={me.role} />
      <div className="mt-5">{children}</div>
    </div>
  );
}
