export type ModuleMeta = {
  key:
    | "DASHBOARD"
    | "KALITE"
    | "EGITIM"
    | "CALL_FEEDBACK"
    | "EXAMPLE_CALL"
    | "USERS"
    | "LOG"
    | "SUGGESTION_REQUEST"
    | "INITIATIVE_WORK";
  title: string;
  href: string;
  description: string;
  source: "manual" | "aggregate" | "admin";
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
    key: "SUGGESTION_REQUEST",
    title: "Öneri - Talep",
    href: "/oneri-talep",
    description: "Tüm kullanıcıların öneri ve talep kayıtları",
    source: "manual",
    icon: "scroll-text",
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
    key: "CALL_FEEDBACK",
    title: "Çağrı Geribildirim",
    href: "/cagri-geribildirim",
    description: "Çağrı geribildirim kayıtları",
    source: "manual",
    icon: "message-circle",
  },
  {
    key: "KALITE",
    title: "Çağrı Denetleme",
    href: "/kalite",
    description: "Dinlenen çağrıların puan ve not kayıtları",
    source: "manual",
    icon: "star",
  },
  {
    key: "EXAMPLE_CALL",
    title: "Örnek Çağrı ve Motivasyon",
    href: "/ornek-cagri",
    description: "Örnek çağrı ve motivasyon adetleri",
    source: "manual",
    icon: "sparkles",
  },
  {
    key: "INITIATIVE_WORK",
    title: "İnsiyatif Çalışma",
    href: "/insiyatif-calisma",
    description: "Kendi insiyatifi ile çalışan personel kayıtları",
    source: "manual",
    icon: "briefcase",
  },
  {
    key: "USERS",
    title: "Kullanıcı Yönetimi",
    href: "/kullanicilar",
    description: "Kullanıcı hesapları ve roller",
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

export function getModuleMeta(href: string) {
  return NAV_MODULES.find((m) => m.href === href);
}
