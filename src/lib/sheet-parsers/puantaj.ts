import type { ParsedSheetRow } from "@/lib/sheet-parsers/utils";
import {
  cellStr,
  headerIndex,
  normalizeHeader,
  parseSheetDate,
} from "@/lib/sheet-parsers/utils";
import { sheetPersonelName } from "@/lib/utils";

export type PuantajGunDeger = {
  status: string;
  mesaiGun: number;
  izinGun: number;
};

/** VAR=1, HAFTALIK İZİN=1 mesai, YARIM=0.5+0.5, YOK=0 mesai +1 izin */
export function parsePuantajCell(raw: string): PuantajGunDeger {
  const v = raw.trim().toUpperCase();
  if (!v) return { status: "", mesaiGun: 0, izinGun: 0 };

  if (v.startsWith("VAR")) return { status: "VAR", mesaiGun: 1, izinGun: 0 };
  if (v.startsWith("YOK")) return { status: "YOK", mesaiGun: 0, izinGun: 1 };
  if (v.startsWith("HAFT")) return { status: "HAFTALIK_IZIN", mesaiGun: 1, izinGun: 0 };
  if (v.startsWith("YARI")) return { status: "YARIM", mesaiGun: 0.5, izinGun: 0.5 };

  return { status: v, mesaiGun: 0, izinGun: 0 };
}

/**
 * Puantaj matrisi: A=personel, B..n=tarih kolonları.
 * Her personel × gün için bir satır üretir.
 */
export function parsePuantajSheet(
  headers: string[],
  dataRows: unknown[][],
): ParsedSheetRow[] {
  const personelIdx = headerIndex(headers, "personel adi", "personel adı", "personel");
  const dateColumns: { index: number; header: string; date: Date | null }[] = [];

  headers.forEach((header, index) => {
    if (index === personelIdx) return;
    const h = header?.trim() ?? "";
    if (!h) return;
    const nh = normalizeHeader(h);
    if (nh.includes("personel")) return;
    dateColumns.push({
      index,
      header: h,
      date: parseSheetDate(h),
    });
  });

  const out: ParsedSheetRow[] = [];

  for (const row of dataRows) {
    const rawName = personelIdx >= 0 ? cellStr(row, personelIdx) : "";
    const personelName = sheetPersonelName(rawName);
    if (!personelName) continue;

    for (const col of dateColumns) {
      const raw = cellStr(row, col.index);
      if (!raw) continue;

      const gun = parsePuantajCell(raw);
      if (!gun.status) continue;

      out.push({
        personelName,
        recordDate: col.date,
        rowData: {
          Tarih: col.header,
          Durum: gun.status,
          "Mesai (gün)": String(gun.mesaiGun),
          "İzin / devamsızlık (gün)": String(gun.izinGun),
        },
      });
    }
  }

  return out;
}

/** Tarih aralığında personel bazında toplam mesai ve izin günü */
export function aggregatePuantajByPersonel(
  rows: { personelName: string | null; recordDate: Date | null; rowData: Record<string, unknown> }[],
  from: Date,
  to: Date,
) {
  const map = new Map<string, { mesai: number; izin: number; gunSayisi: number }>();

  for (const row of rows) {
    if (!row.personelName) continue;
    let recordDate = row.recordDate;
    if (!recordDate) {
      const tarih = row.rowData["Tarih"];
      if (typeof tarih === "string") recordDate = parseSheetDate(tarih);
    }
    if (!recordDate || recordDate < from || recordDate > to) continue;

    const key = row.personelName.trim();
    const durumRaw = String(row.rowData["Durum"] ?? "");
    const parsed = durumRaw ? parsePuantajCell(durumRaw) : null;
    const mesai = Number(
      row.rowData["Mesai (gün)"] ??
        (parsed ? parsed.mesaiGun : row.rowData.mesaiGun ?? 0),
    );
    const izin = Number(
      row.rowData["İzin / devamsızlık (gün)"] ??
        (parsed ? parsed.izinGun : row.rowData.izinGun ?? 0),
    );

    const entry = map.get(key) ?? { mesai: 0, izin: 0, gunSayisi: 0 };
    entry.mesai += mesai;
    entry.izin += izin;
    entry.gunSayisi += 1;
    map.set(key, entry);
  }

  return [...map.entries()]
    .map(([personelName, v]) => ({
      personelName,
      mesaiGun: Number(v.mesai.toFixed(1)),
      izinGun: Number(v.izin.toFixed(1)),
      kayitliGun: v.gunSayisi,
    }))
    .sort((a, b) => a.personelName.localeCompare(b.personelName, "tr"));
}
