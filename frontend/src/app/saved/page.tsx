import type { Metadata } from "next";
import SavedApp from "@/components/saved/SavedApp";

export const metadata: Metadata = { title: "Saved properties" };

export default function SavedPage() {
  return <SavedApp />;
}
