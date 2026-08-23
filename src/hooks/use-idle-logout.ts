"use client";

import { useEffect } from "react";

const IDLE_MS = 60 * 60 * 1000;
const STORAGE_KEY = "cc_panel_last_activity";
const CHECK_MS = 15_000;

export function useIdleLogout() {
  useEffect(() => {
    let loggingOut = false;

    async function logout() {
      if (loggingOut) return;
      loggingOut = true;
      try {
        localStorage.removeItem(STORAGE_KEY);
        await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      } finally {
        window.location.href = "/login";
      }
    }

    function lastActivity() {
      const raw = localStorage.getItem(STORAGE_KEY);
      const value = raw ? Number(raw) : 0;
      return Number.isFinite(value) ? value : 0;
    }

    function touch() {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    }

    function check() {
      const last = lastActivity();
      if (!last) {
        touch();
        return;
      }
      if (Date.now() - last >= IDLE_MS) void logout();
    }

    let lastTouch = 0;
    function onActivity() {
      const now = Date.now();
      if (now - lastTouch < 1000) return;
      lastTouch = now;
      touch();
    }

    touch();
    check();

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"] as const;
    for (const event of events) {
      window.addEventListener(event, onActivity, { passive: true });
    }
    const timer = setInterval(check, CHECK_MS);
    function onVisibility() {
      if (document.visibilityState === "visible") check();
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      for (const event of events) {
        window.removeEventListener(event, onActivity);
      }
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
}
