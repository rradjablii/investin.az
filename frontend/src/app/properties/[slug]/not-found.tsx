import Link from "next/link";

export default function PropertyNotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">This property is no longer available</h1>
      <p className="mt-2 text-ink-2">The listing may have been sold, withdrawn, or is being reviewed. It may also never have existed at this address.</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/explore" className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink">Back to the map</Link>
        <Link href="/saved" className="rounded-md border border-line-2 px-4 py-2 text-sm font-medium">Saved properties</Link>
      </div>
    </div>
  );
}
