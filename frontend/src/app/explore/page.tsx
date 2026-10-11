import type { Metadata } from "next";
import ExploreApp from "@/components/explore/ExploreApp";

export const metadata: Metadata = { title: "Explore Baku on the map" };

export default function ExplorePage() {
  return <ExploreApp />;
}
