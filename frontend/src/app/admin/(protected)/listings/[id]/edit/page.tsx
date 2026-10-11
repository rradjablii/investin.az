import ListingEditor from "@/components/admin/ListingEditor";

export const metadata = { title: "Edit listing" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ListingEditor id={id} />;
}
