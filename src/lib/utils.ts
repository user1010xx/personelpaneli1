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

/** Sheet satırlarında personelName alanı için tutarlı gösterim */
export function sheetPersonelName(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  return displayPersonelName(value);
}
