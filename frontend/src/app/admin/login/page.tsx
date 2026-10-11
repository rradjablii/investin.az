import type { Metadata } from "next";
import LoginForm from "@/components/admin/LoginForm";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false } };

export default function AdminLoginPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-xl font-semibold">Administrator sign in</h1>
      <p className="mt-1 text-sm text-ink-2">Staff only. This area manages the property catalog.</p>
      <LoginForm />
    </div>
  );
}
