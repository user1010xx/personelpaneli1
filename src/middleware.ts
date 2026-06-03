import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout", "/api/health"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isTrustedRequestSource(request: NextRequest) {
  const expectedOrigin = request.nextUrl.origin;
  const origin = request.headers.get("origin");
  if (origin) return origin === expectedOrigin;

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin === expectedOrigin;
    } catch {
      return false;
    }
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return false;

  return true;
}

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[middleware] JWT_SECRET tanımlı değil — korumalı rotalar kapalı");
    }
    return null;
  }
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.endsWith(".png")
  ) {
    return NextResponse.next();
  }

  const isPublic = isPublicPath(pathname);
  const unsafeApiMethod = ["POST", "PUT", "PATCH", "DELETE"].includes(request.method);
  if (pathname.startsWith("/api/") && unsafeApiMethod) {
    if (!isTrustedRequestSource(request)) {
      return NextResponse.json({ error: "Geçersiz istek kaynağı" }, { status: 403 });
    }
  }

  const token = request.cookies.get("cc_panel_token")?.value;
  const secret = getSecret();

  let isAuthenticated = false;
  if (token && secret) {
    try {
      await jwtVerify(token, secret);
      isAuthenticated = true;
    } catch {
      isAuthenticated = false;
    }
  }

  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(isAuthenticated ? "/dashboard" : "/login", request.url),
    );
  }

  if (!isAuthenticated && !isPublic) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthenticated && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!isAuthenticated && pathname === "/api/auth/logout") {
    const res = NextResponse.json({ ok: true });
    res.cookies.delete("cc_panel_token");
    return res;
  }

  const adminOnlyPath =
    pathname.startsWith("/kullanicilar") ||
    pathname.startsWith("/personel-eslestirme") ||
    pathname.startsWith("/log") ||
    pathname.startsWith("/api/users") ||
    pathname.startsWith("/api/personel-aliases") ||
    pathname.startsWith("/api/activity-logs") ||
    pathname.startsWith("/api/sheets/config");

  if (adminOnlyPath && isAuthenticated && token && secret) {
    try {
      const { payload } = await jwtVerify(token, secret);
      if (payload.role !== "ADMIN") {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json({ error: "Admin yetkisi gerekli" }, { status: 403 });
        }
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    } catch {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
