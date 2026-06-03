import { SheetModulePage } from "@/components/modules/sheet-module-page";
import { hasGoogleServiceAccount } from "@/lib/google-env";

export default function PersonelPage() {
  return (
    <SheetModulePage
      moduleKey="PERSONEL"
      title="Personel"
      description="Google Sheets personel listesi."
      sheetsConfigured={hasGoogleServiceAccount()}
    />
  );
}
