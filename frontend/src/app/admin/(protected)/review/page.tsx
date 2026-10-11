import AdminListings from "@/components/admin/AdminListings";

export const metadata = { title: "Review queue" };

export default function Page() {
  return <AdminListings mode="review" />;
}
