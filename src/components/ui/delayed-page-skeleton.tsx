"use client";

import { useEffect, useState } from "react";
import { PageSkeleton } from "@/components/ui/page-skeleton";

/** Çok hızlı geçişlerde gereksiz iskelet flaşını önler */
export function DelayedPageSkeleton({ delayMs = 120 }: { delayMs?: number }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setShow(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs]);

  if (!show) return <div className="min-h-[40vh]" aria-hidden />;
  return <PageSkeleton />;
}
