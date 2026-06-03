"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { PanelLogo } from "@/components/ui/panel-logo";
import { safeNextPath } from "@/lib/safe-redirect";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error ?? "Giriş başarısız");
      return;
    }

    router.push(safeNextPath(searchParams.get("next")));
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen">
      <LoginHero />
      <div className="flex flex-1 items-center justify-center bg-[var(--surface)] px-6 py-12">
        <div className="w-full max-w-[420px] animate-fade-in">
          <div className="panel-card overflow-hidden p-8 sm:p-10">
            <div className="text-center">
              <div className="mx-auto mb-5 flex justify-center">
                <PanelLogo size="lg" showStatus={false} />
              </div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
                Hoş geldiniz
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Çağrı merkezi operasyon paneline giriş yapın
              </p>
            </div>

            <form onSubmit={onSubmit} className="mt-8 space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email">E-posta</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="ornek@sirket.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Şifre</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error ? (
                <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 ring-1 ring-rose-100">
                  {error}
                </p>
              ) : null}
              <Button type="submit" className="h-11 w-full text-base" disabled={loading}>
                {loading ? "Giriş yapılıyor..." : "Panele Giriş Yap"}
              </Button>
            </form>

            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              Güvenli oturum · şifreli bağlantı
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginHero() {
  return (
    <div className="relative hidden w-[44%] max-w-xl flex-col justify-between overflow-hidden bg-sidebar p-10 text-white lg:flex xl:max-w-2xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(59,130,246,0.25)_0%,transparent_55%)]" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-indigo-600/20 blur-3xl" />

      <div className="relative">
        <PanelLogo size="md" showStatus={false} className="shadow-none" />
        <h2 className="mt-8 font-display text-3xl font-bold leading-tight">
          Operasyon verileriniz tek panelde
        </h2>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
          Personel, puantaj, kalite ve çağrı metriklerini gerçek zamanlı takip edin. Profesyonel
          raporlama ve ekip yönetimi.
        </p>
      </div>

      <ul className="relative space-y-3 text-sm text-slate-400">
        <li className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
          Google Sheets senkronizasyonu
        </li>
        <li className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
          Dashboard ve dönem özetleri
        </li>
        <li className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
          Rol tabanlı güvenli erişim
        </li>
      </ul>
    </div>
  );
}
