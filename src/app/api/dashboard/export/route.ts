import { NextResponse } from "next/server";
import { formatDuration, getDashboardData } from "@/lib/dashboard";
import { rowsToWorkbook } from "@/lib/excel";
import { parseDate, requireApiUser } from "@/lib/api-helpers";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const data = await getDashboardData({
    from: parseDate(searchParams.get("from")),
    to: parseDate(searchParams.get("to")),
    search: searchParams.get("search") ?? undefined,
  });

  const buffer = rowsToWorkbook(
    data.rows.map((p) => ({
      personel_adi: p.personelName,
      uye_adedi: p.uyeAdedi,
      ortalama_arama_adedi: p.ortalamaAramaAdedi,
      ortalama_konusma_suresi: formatDuration(p.ortalamaKonusmaSuresi),
      ortalama_cagri_puani: p.ortalamaCagriPuani,
      ortalama_whatsapp_cevapsiz: p.ortalamaWhatsappCevapsiz,
    })),
    "Personel Performans",
  );

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="dashboard-${Date.now()}.xlsx"`,
    },
  });
}
