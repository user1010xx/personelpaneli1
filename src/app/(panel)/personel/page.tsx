import { SheetModulePage } from "@/components/modules/sheet-module-page";
import { getSessionUserFromDb } from "@/lib/auth";
import { hasGoogleServiceAccount } from "@/lib/google-env";

export default async function PersonelPage() {
  const user = await getSessionUserFromDb();
  return (
    <SheetModulePage
      moduleKey="PERSONEL"
      title="Personel"
      description="Google Sheets personel listesi."
      sheetsConfigured={hasGoogleServiceAccount()}
      canManage={Boolean(user)}
    />
  );
}
