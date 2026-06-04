import { ExcelModulePage } from "@/components/modules/excel-module-page";
import { getSessionUserFromDb } from "@/lib/auth";

export default async function CagriSureciPage() {
  const user = await getSessionUserFromDb();
  return (
    <ExcelModulePage
      moduleKey="CAGRI_SURECI"
      title="Çağrı Süreci"
      description="Excel ile çağrı süreci verisi yükleme ve listeleme."
      canManage={Boolean(user)}
    />
  );
}
