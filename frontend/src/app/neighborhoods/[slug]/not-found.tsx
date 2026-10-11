import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">Neighborhood not found</h1>
      <p className="mt-2 text-ink-2">We don&apos;t have a record for this neighborhood.</p>
      <Link href="/neighborhoods" className="mt-6 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink">Browse neighborhoods</Link>
    </div>
  );
}
