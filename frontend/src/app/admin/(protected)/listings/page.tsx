import AdminListings from "@/components/admin/AdminListings";

export const metadata = { title: "Admin listings" };

export default function Page() {
  return <AdminListings mode="all" />;
}
