import type { Metadata } from "next";

export const metadata: Metadata = { title: "About and data practices" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">About investin.az</h1>
      <div className="mt-4 space-y-4 text-ink-2">
        <p>investin.az is a map-first way to explore property for sale in Baku, Azerbaijan. It is aimed at buyers who may not know the local market and want to understand where things are before they look at details.</p>

        <h2 className="pt-2 text-lg font-semibold text-ink">Where the data comes from</h2>
        <p>Listings are entered and reviewed by hand from sources that have given permission. We do not scrape other property websites and we do not publish photographs or descriptions without permission. Every listing shows its source and when it was last checked.</p>

        <h2 className="pt-2 text-lg font-semibold text-ink">Prices and currencies</h2>
        <p>Prices are asking prices in the currency the seller advertised. We never convert or compare prices across currencies, so price filters and sorting require you to pick a currency first. An asking price is not a sale price or a valuation.</p>

        <h2 className="pt-2 text-lg font-semibold text-ink">Locations</h2>
        <p>Many listings show an approximate position (rounded to roughly 100 m) rather than the exact address.</p>

        <h2 className="pt-2 text-lg font-semibold text-ink">Verification</h2>
        <p>We only show a verification label such as &ldquo;Location reviewed&rdquo; or &ldquo;Source contacted&rdquo; after that step has actually been carried out and recorded. Entering a listing does not make it verified.</p>

        <h2 className="pt-2 text-lg font-semibold text-ink">Saved properties and your data</h2>
        <p>Saved properties are stored only in this browser. They do not sync to other devices and you don&apos;t need an account. If you send an inquiry, your name, email and message are stored so the seller or agency can reply; they are never shown publicly.</p>

        <h2 className="pt-2 text-lg font-semibold text-ink">Limitations</h2>
        <p>This is an early version covering Baku only. Neighborhood statistics are shown only when enough listings exist to be meaningful. Nothing here is investment, legal or tax advice.</p>

        <h2 className="pt-2 text-lg font-semibold text-ink">Map data</h2>
        <p>Map tiles and styling are provided by OpenFreeMap using OpenStreetMap data (© OpenStreetMap contributors) unless the site operator has configured another provider; attribution is displayed on the map.</p>
      </div>
    </div>
  );
}
