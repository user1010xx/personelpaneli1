"use client";

import { useEffect, useState } from "react";

/** Remember filters / sort when switching sidebar modules (session only). */
export function usePersistedPageState<T extends Record<string, unknown>>(
  pageId: string,
  initial: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const storageKey = `panel-ui:${pageId}`;

  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return initial;
      return { ...initial, ...JSON.parse(raw) } as T;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      /* quota / private mode */
    }
  }, [storageKey, state]);

  return [state, setState];
}
