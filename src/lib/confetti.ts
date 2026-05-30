"use client";

import confetti from "canvas-confetti";

const COLORS = ["#ff4d97", "#ffc233", "#b57bf0", "#ffd9ea", "#ff6aa9"];

/** Estallido de confeti de marca. Respeta prefers-reduced-motion. */
export function celebrate(power = 1) {
  if (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }
  const count = Math.round(80 * power);
  confetti({
    particleCount: count,
    spread: 75,
    origin: { y: 0.7 },
    colors: COLORS,
    scalar: 1.05,
    ticks: 220,
  });
  // Dos ráfagas laterales para más fiesta
  confetti({
    particleCount: Math.round(count / 2),
    angle: 60,
    spread: 55,
    origin: { x: 0, y: 0.8 },
    colors: COLORS,
  });
  confetti({
    particleCount: Math.round(count / 2),
    angle: 120,
    spread: 55,
    origin: { x: 1, y: 0.8 },
    colors: COLORS,
  });
}
