import { ExcelModulePage } from "@/components/modules/excel-module-page";
import { getSessionUserFromDb } from "@/lib/auth";

export default async function UyeAdediPage() {
  const user = await getSessionUserFromDb();
  return (
    <ExcelModulePage
      moduleKey="UYE_ADEDI"
      title="Üye Adedi"
      description="Excel ile üye adedi verisi yükleme ve listeleme."
      canManage={Boolean(user)}
    />
  );
}
