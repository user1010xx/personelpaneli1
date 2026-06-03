import type { ModuleKey } from "@prisma/client";

export type ModuleMeta = {
  key: ModuleKey | "DASHBOARD" | "KALITE" | "EGITIM" | "USERS" | "LOG";
  title: string;
  href: string;
  description: string;
  source: "sheet" | "excel" | "manual" | "aggregate" | "admin";
  icon: string;
};

export const NAV_MODULES: ModuleMeta[] = [
  {
    key: "DASHBOARD",
    title: "Dashboard",
    href: "/dashboard",
    description: "Özet performans ve sıralamalar",
    source: "aggregate",
    icon: "layout-dashboard",
  },
  {
    key: "PERSONEL",
    title: "Personel",
    href: "/personel",
    description: "Sheets’teki tüm personel kolonları aynen (kısıtsız). Günlük güncelleme.",
    source: "sheet",
    icon: "users",
  },
  {
    key: "PUANTAJ",
    title: "Puantaj",
    href: "/puantaj",
    description: "VAR/YARIM/HAFTALIK İZİN/YOK → mesai ve izin günü; dönem özeti otomatik.",
    source: "sheet",
    icon: "calendar-clock",
  },
  {
    key: "UYARI_KESINTI",
    title: "Uyarı Kesinti",
    href: "/uyari-kesinti",
    description: "Kesinti boşsa uyarı; “X gün” varsa kesinti. Konu ve tarih korunur.",
    source: "sheet",
    icon: "alert-triangle",
  },
  {
    key: "WHATSAPP",
    title: "WhatsApp Süreci",
    href: "/whatsapp",
    description: "Yalnızca personel, ortalama ve toplam cevapsız (günlük kolonlar hariç).",
    source: "sheet",
    icon: "message-circle",
  },
  {
    key: "EGITIM",
    title: "Eğitim Geribildirim",
    href: "/egitim",
    description: "Manuel eğitim kayıtları",
    source: "manual",
    icon: "graduation-cap",
  },
  {
    key: "KALITE",
    title: "Kalite Puanlaması",
    href: "/kalite",
    description: "Manuel kalite puan kayıtları",
    source: "manual",
    icon: "star",
  },
  {
    key: "UYE_ADEDI",
    title: "Üye Adedi",
    href: "/uye-adedi",
    description: "Excel ile yüklenen üye adedi verisi",
    source: "excel",
    icon: "user-plus",
  },
  {
    key: "CAGRI_SURECI",
    title: "Çağrı Süreci",
    href: "/cagri-sureci",
    description: "Excel ile yüklenen çağrı süreci verisi",
    source: "excel",
    icon: "phone",
  },
  {
    key: "USERS",
    title: "Kullanıcı Yönetimi",
    href: "/kullanicilar",
    description: "Kullanıcı ve Google Sheets bağlantıları",
    source: "admin",
    icon: "shield",
  },
  {
    key: "LOG",
    title: "LOG",
    href: "/log",
    description: "Tüm kullanıcı ve admin işlem geçmişi",
    source: "admin",
    icon: "scroll-text",
  },
];

export const SHEET_MODULES: ModuleKey[] = [
  "PERSONEL",
  "PUANTAJ",
  "WHATSAPP",
  "UYARI_KESINTI",
];

export const EXCEL_MODULES: ModuleKey[] = ["UYE_ADEDI", "CAGRI_SURECI"];

export function getModuleMeta(href: string) {
  return NAV_MODULES.find((m) => m.href === href);
}
