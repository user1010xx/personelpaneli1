import { SheetModulePage } from "@/components/modules/sheet-module-page";
import { hasGoogleServiceAccount } from "@/lib/google-env";

export default function PuantajPage() {
  return (
    <SheetModulePage
      moduleKey="PUANTAJ"
      title="Puantaj"
      description="Günlük puantaj Google Sheets'te tutulur; bu sayfada seçilen dönemin personel bazında toplam mesai ve izin günleri gösterilir."
      sheetsConfigured={hasGoogleServiceAccount()}
    />
  );
}
