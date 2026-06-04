import { SheetModulePage } from "@/components/modules/sheet-module-page";
import { getSessionUserFromDb } from "@/lib/auth";
import { hasGoogleServiceAccount } from "@/lib/google-env";

export default async function UyariKesintiPage() {
  const user = await getSessionUserFromDb();
  return (
    <SheetModulePage
      moduleKey="UYARI_KESINTI"
      title="Uyarı Kesinti"
      description="Google Sheets uyarı ve kesinti kayıtları."
      sheetsConfigured={hasGoogleServiceAccount()}
      canManage={Boolean(user)}
    />
  );
}
