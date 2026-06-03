import { UsersAdminPage } from "@/components/admin/users-admin-page";
import { requireAdmin } from "@/lib/auth";

export default async function KullanicilarPage() {
  await requireAdmin();
  return <UsersAdminPage />;
}
