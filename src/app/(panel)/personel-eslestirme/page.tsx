import { PersonelAliasPage } from "@/components/admin/personel-alias-page";
import { requireAdmin } from "@/lib/auth";

export default async function PersonelEslestirmePage() {
  await requireAdmin();
  return <PersonelAliasPage />;
}