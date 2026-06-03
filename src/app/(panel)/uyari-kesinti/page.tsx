import { SheetModulePage } from "@/components/modules/sheet-module-page";
import { hasGoogleServiceAccount } from "@/lib/google-env";

export default function UyariKesintiPage() {
  return (
    <SheetModulePage
      moduleKey="UYARI_KESINTI"
      title="Uyarı Kesinti"
      description="Google Sheets uyarı ve kesinti kayıtları."
      sheetsConfigured={hasGoogleServiceAccount()}
    />
  );
}
