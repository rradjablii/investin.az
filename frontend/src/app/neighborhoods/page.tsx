import type { Metadata } from "next";
import Link from "next/link";
import { getNeighborhoods } from "@/lib/server-api";
import { StateMessage } from "@/components/ui/StateMessage";

export const metadata: Metadata = { title: "Neighborhoods" };

export default async function NeighborhoodsPage() {
  const hoods = await getNeighborhoods().catch(() => null);
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Baku neighborhoods</h1>
      <p className="mt-2 max-w-2xl text-ink-2">
        The administrative districts of Baku. Listing counts are live and only include currently published properties.
      </p>
      {!hoods ? (
        <StateMessage tone="error" title="Neighborhoods couldn't be loaded">Please refresh the page in a moment.</StateMessage>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {hoods.map((h) => (
            <li key={h.slug}>
              <Link href={`/neighborhoods/${h.slug}`} className="block rounded-lg border border-line bg-surface p-4 hover:border-line-2 hover:bg-bg">
                <p className="font-medium">{h.name}</p>
                <p className="mt-1 text-sm text-ink-2">{h.listingCount === 0 ? "No published listings yet" : `${h.listingCount} published ${h.listingCount === 1 ? "listing" : "listings"}`}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
