import { SheetModulePage } from "@/components/modules/sheet-module-page";
import { getSessionUserFromDb } from "@/lib/auth";
import { hasGoogleServiceAccount } from "@/lib/google-env";

export default async function PuantajPage() {
  const user = await getSessionUserFromDb();
  return (
    <SheetModulePage
      moduleKey="PUANTAJ"
      title="Puantaj"
      description="Günlük puantaj Google Sheets'te tutulur; bu sayfada seçilen dönemin personel bazında toplam mesai ve izin günleri gösterilir."
      sheetsConfigured={hasGoogleServiceAccount()}
      canManage={user?.role === "ADMIN"}
    />
  );
}
