import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/dashboard";
import { rowsToWorkbook } from "@/lib/excel-export";
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

  const buffer = await rowsToWorkbook(
    data.rows.map((p) => ({
      personel_adi: p.personelName,
      dinlenen_cagri_adedi: p.dinlenenCagriAdedi,
      ortalama_puan: p.ortalamaPuan,
      insiyatif_calisma_adedi: p.insiyatifAdedi,
      geribildirim_adedi: p.geribildirimAdedi,
      egitim_adedi: p.egitimAdedi,
      ornek_cagri_adedi: p.ornekCagriAdedi,
      motivasyon_adedi: p.motivasyonAdedi,
    })),
    "Personel Ozeti",
  );

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="dashboard-${Date.now()}.xlsx"`,
    },
  });
}
