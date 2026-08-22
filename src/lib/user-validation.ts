import { z } from "zod";

/** Türkçe klavyede sık yapılan e-posta yazım hataları */
export function normalizeEmailInput(raw: string): string {
  let email = raw.trim().toLowerCase();
  email = email.replace(/\.cım$/i, ".com");
  email = email.replace(/\.comm$/i, ".com");
  email = email.replace(/\.con$/i, ".com");
  return email;
}

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "En az 2 karakter girin"),
  email: z
    .string()
    .trim()
    .min(1, "E-posta gerekli")
    .transform(normalizeEmailInput)
    .pipe(z.string().email("Geçerli bir e-posta adresi girin (ör. ad@firma.com)")),
  password: z.string().min(8, "Şifre en az 8 karakter olmalı"),
  role: z.enum(["ADMIN", "USER"]).optional(),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2, "En az 2 karakter girin").optional(),
  email: z
    .string()
    .trim()
    .transform(normalizeEmailInput)
    .pipe(z.string().email("Geçerli bir e-posta adresi girin"))
    .optional(),
  password: z.string().min(8, "Şifre en az 8 karakter olmalı").optional(),
  role: z.enum(["ADMIN", "USER"]).optional(),
  active: z.boolean().optional(),
});

export function zodErrorMessage(error: z.ZodError): string {
  const labels: Record<string, string> = {
    name: "Ad soyad",
    email: "E-posta",
    password: "Şifre",
    role: "Rol",
    active: "Durum",
  };
  const first = error.errors[0];
  if (!first) return "Geçersiz veri";
  const field = labels[String(first.path[0] ?? "")] ?? "Alan";
  return first.message ? `${field}: ${first.message}` : "Geçersiz veri";
}

export function validateUserFormClient(form: {
  name: string;
  email: string;
  password: string;
}): string | null {
  if (form.name.trim().length < 2) return "Ad soyad en az 2 karakter olmalı";
  const email = normalizeEmailInput(form.email);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email)) {
    return "Geçerli bir e-posta adresi girin (ör. ad@firma.com). .com yerine .cım yazılmış olabilir.";
  }
  if (form.password.length < 8) return "Şifre en az 8 karakter olmalı";
  return null;
}
