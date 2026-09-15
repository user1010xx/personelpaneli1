import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizePersonelName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğışöü]/g, (char) => {
      const map: Record<string, string> = {
        ç: "c",
        ğ: "g",
        ı: "i",
        ş: "s",
        ö: "o",
        ü: "u",
      };
      return map[char] ?? char;
    });
}

export function displayPersonelName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function preferredPersonnelNames(rows: { personelName: string }[]) {
  const counts = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const display = displayPersonelName(row.personelName);
    const key = normalizePersonelName(display);
    const variants = counts.get(key) ?? new Map<string, number>();
    variants.set(display, (variants.get(display) ?? 0) + 1);
    counts.set(key, variants);
  }

  return new Map(
    [...counts].map(([key, variants]) => {
      const preferred = [...variants].sort((a, b) => b[1] - a[1])[0]?.[0] ?? key;
      return [key, preferred];
    }),
  );
}
