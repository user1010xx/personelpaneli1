import { SheetModulePage } from "@/components/modules/sheet-module-page";
import { hasGoogleServiceAccount } from "@/lib/google-env";

export default function WhatsappPage() {
  return (
    <SheetModulePage
      moduleKey="WHATSAPP"
      title="WhatsApp Süreci"
      description="Google Sheets WhatsApp süreç ve cevapsız mesaj verileri."
      sheetsConfigured={hasGoogleServiceAccount()}
    />
  );
}
