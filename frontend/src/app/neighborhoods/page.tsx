import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getNeighborhoods } from "@/lib/server-api";
import { StateMessage } from "@/components/ui/StateMessage";

export const metadata: Metadata = { title: "Neighborhoods" };

export default async function NeighborhoodsPage() {
  const hoods = await getNeighborhoods().catch(() => null);
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-[1.75rem] font-semibold sm:text-[2rem]">Baku neighborhoods</h1>
      <p className="mt-2 max-w-2xl text-ink-2">
        The administrative districts of Baku. Listing counts are live and only include currently published properties.
      </p>
      {!hoods ? (
        <StateMessage tone="error" title="Neighborhoods couldn't be loaded">Please refresh the page in a moment.</StateMessage>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hoods.map((h) => (
            <li key={h.slug} className="flex flex-col rounded-xl border border-line bg-surface p-5 hover:border-line-2">
              <Link href={`/neighborhoods/${h.slug}`} className="text-lg font-semibold hover:underline">{h.name}</Link>
              <p className="mt-1 text-body text-ink-2">{h.listingCount === 0 ? "No published listings yet" : `${h.listingCount} published ${h.listingCount === 1 ? "listing" : "listings"}`}</p>
              {h.description && <p className="mt-2 line-clamp-3 text-body text-ink-2">{h.description}</p>}
              <div className="mt-auto flex items-center justify-between gap-3 pt-4 text-body">
                <Link href={`/neighborhoods/${h.slug}`} className="font-medium text-accent hover:text-accent-hover hover:underline">Overview</Link>
                <Link href={`/explore?neighborhood=${encodeURIComponent(h.slug)}`} className="inline-flex items-center gap-1 font-medium text-accent hover:text-accent-hover hover:underline">
                  Explore on the map <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
