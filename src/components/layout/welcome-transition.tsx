"use client";

import { useEffect } from "react";

const TRANSITION_DURATION_MS = 2800;

export function WelcomeTransition({
  userName,
  onComplete,
}: {
  userName: string;
  onComplete: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, TRANSITION_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="welcome-screen" role="status" aria-live="polite">
      <div className="welcome-screen__content">
        <h1 className="welcome-screen__title">
          Hoş geldiniz <span className="welcome-screen__name">{userName}</span>
        </h1>
        <p className="welcome-screen__wish">
          Güzel bir gün dilerim <span aria-hidden="true">❤️</span>
        </p>
        <span className="welcome-screen__line" aria-hidden="true" />
      </div>
    </div>
  );
}