"use client";

import { FormEvent, useCallback, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { PanelLogo } from "@/components/ui/panel-logo";
import { safeNextPath } from "@/lib/safe-redirect";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cardRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [shine, setShine] = useState({ x: 50, y: 20 });

  const resetTilt = useCallback(() => {
    setTilt({ x: 0, y: 0 });
    setShine({ x: 50, y: 20 });
  }, []);

  function onCardMove(event: React.MouseEvent<HTMLDivElement>) {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    setTilt({
      x: (0.5 - py) * 10,
      y: (px - 0.5) * 14,
    });
    setShine({ x: px * 100, y: py * 100 });
  }

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
    <div className="login-stage relative flex min-h-screen items-center justify-center px-5 py-12 sm:px-8">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/15 blur-3xl" />

      <div
        className="relative w-full max-w-[520px]"
        style={{ perspective: "1400px" }}
        onMouseMove={onCardMove}
        onMouseLeave={resetTilt}
      >
        <div
          className="absolute inset-x-8 -bottom-10 h-16 rounded-[2rem] bg-black/55 blur-2xl"
          aria-hidden
        />

        <div
          ref={cardRef}
          className="login-card-3d relative overflow-hidden p-8 sm:p-11"
          style={{
            transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(12px)`,
            transition: "transform 180ms ease-out",
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              background: `radial-gradient(520px circle at ${shine.x}% ${shine.y}%, rgba(255,255,255,0.16), transparent 42%)`,
            }}
          />

          <div className="relative">
            <div className="flex items-center gap-3">
              <PanelLogo size="lg" showStatus={false} className="shadow-none ring-1 ring-white/15" />
              <div>
                <p className="font-display text-lg font-semibold leading-none text-white">
                  Çağrı Merkezi
                </p>
                <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.2em] text-white/40">
                  Operasyon paneli
                </p>
              </div>
            </div>

            <h1 className="mt-8 font-display text-[2.15rem] font-semibold leading-none text-white">
              Panele giriş
            </h1>

            <form onSubmit={onSubmit} className="mt-8 space-y-5">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-white/65">E-posta</span>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="ornek@sirket.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="login-input"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-white/65">Şifre</span>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="login-input pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-white/40 transition hover:text-white"
                    aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              {error ? (
                <p className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-100">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-xl bg-brand-500 text-base font-semibold text-ink-950 shadow-[0_10px_24px_-10px_rgba(23,168,136,0.85)] transition hover:bg-brand-400 disabled:opacity-50"
              >
                <Lock className="h-4 w-4" />
                {loading ? "Giriş yapılıyor..." : "Devam et"}
              </button>
            </form>

            <div className="mt-7 flex items-center justify-center gap-2 text-xs text-white/35">
              <ShieldCheck className="h-3.5 w-3.5" />
              Güvenli oturum
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
