import { SheetModulePage } from "@/components/modules/sheet-module-page";
import { getSessionUserFromDb } from "@/lib/auth";
import { hasGoogleServiceAccount } from "@/lib/google-env";

export default async function WhatsappPage() {
  const user = await getSessionUserFromDb();
  return (
    <SheetModulePage
      moduleKey="WHATSAPP"
      title="WhatsApp Süreci"
      description="Google Sheets WhatsApp süreç ve cevapsız mesaj verileri."
      sheetsConfigured={hasGoogleServiceAccount()}
      canManage={Boolean(user)}
    />
  );
}
