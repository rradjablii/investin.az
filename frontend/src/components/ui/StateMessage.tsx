import type { ReactNode } from "react";

export function StateMessage({ title, children, action, tone = "neutral" }: {
  title: string; children?: ReactNode; action?: ReactNode; tone?: "neutral" | "error";
}) {
  return (
    <div role={tone === "error" ? "alert" : "status"}
      className={`mx-auto my-8 max-w-sm rounded-lg border p-5 text-center ${tone === "error" ? "border-danger/25 bg-danger-soft" : "border-line bg-surface"}`}>
      <p className="font-medium">{title}</p>
      {children && <div className="mt-1 text-body text-ink-2">{children}</div>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-body text-ink-2">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-line-2 border-t-accent" aria-hidden />
      {label}
    </span>
  );
}

export function PrimaryButton({ className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-body font-medium text-accent-ink hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 ${className}`} />;
}

export function SecondaryButton({ className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-line-2 bg-surface px-4 py-2 text-body font-medium text-ink hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50 ${className}`} />;
}
