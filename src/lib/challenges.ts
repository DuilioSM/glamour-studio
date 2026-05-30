"use client";

import { useSyncExternalStore } from "react";
import { type Category } from "./types";

// ============================================================
// Modo Historia — niveles de outfit con hasta 3 ESTRELLAS cada uno.
// Cada nivel define 3 metas progresivas (1★, 2★, 3★). Se evalúan
// localmente con reglas (sin IA, sin costo). El progreso se guarda
// en localStorage (sin tocar Supabase).
// ============================================================

export type Rule =
  | { kind: "min"; n: number }
  | { kind: "max"; n: number }
  | { kind: "exact"; n: number }
  | { kind: "requireCat"; cat: Category }
  | { kind: "anyCat"; cats: Category[] };

export interface Tier {
  /** Texto de la meta para esta estrella. */
  label: string;
  /** Reglas (todas deben cumplirse) para ganar esta estrella. */
  rules: Rule[];
}

export interface Challenge {
  id: string;
  emoji: string;
  title: string;
  /** Descripción narrativa. */
  prompt: string;
  /** Exactamente 3 metas progresivas: 1★, 2★, 3★. */
  tiers: [Tier, Tier, Tier];
}

export const MAX_STARS_PER_LEVEL = 3;

export const CHALLENGES: Challenge[] = [
  {
    id: "casual",
    emoji: "🌳",
    title: "Día en el parque",
    prompt: "Empieza fácil: arma un look cómodo y casual.",
    tiers: [
      { label: "Ponte una blusa", rules: [{ kind: "requireCat", cat: "top" }] },
      {
        label: "Blusa + pantalón",
        rules: [
          { kind: "requireCat", cat: "top" },
          { kind: "requireCat", cat: "bottom" },
        ],
      },
      {
        label: "Añade zapatos",
        rules: [
          { kind: "requireCat", cat: "top" },
          { kind: "requireCat", cat: "bottom" },
          { kind: "requireCat", cat: "shoes" },
        ],
      },
    ],
  },
  {
    id: "trio",
    emoji: "✨",
    title: "Trío perfecto",
    prompt: "El número mágico es 3. Encuentra el equilibrio.",
    tiers: [
      { label: "Usa al menos 2 prendas", rules: [{ kind: "min", n: 2 }] },
      { label: "Usa exactamente 3", rules: [{ kind: "exact", n: 3 }] },
      {
        label: "3 prendas con un accesorio",
        rules: [
          { kind: "exact", n: 3 },
          { kind: "requireCat", cat: "accessory" },
        ],
      },
    ],
  },
  {
    id: "dress",
    emoji: "👗",
    title: "Reina del vestido",
    prompt: "Que el vestido sea la estrella del look.",
    tiers: [
      {
        label: "Luce un vestido",
        rules: [{ kind: "requireCat", cat: "dress" }],
      },
      {
        label: "Vestido + zapatos",
        rules: [
          { kind: "requireCat", cat: "dress" },
          { kind: "requireCat", cat: "shoes" },
        ],
      },
      {
        label: "Remátalo con un accesorio",
        rules: [
          { kind: "requireCat", cat: "dress" },
          { kind: "requireCat", cat: "shoes" },
          { kind: "requireCat", cat: "accessory" },
        ],
      },
    ],
  },
  {
    id: "mini",
    emoji: "✌️",
    title: "Minimalista chic",
    prompt: "Menos es más. Demuestra que con poco luces increíble.",
    tiers: [
      { label: "Máximo 2 prendas", rules: [{ kind: "max", n: 2 }] },
      { label: "Exactamente 2 prendas", rules: [{ kind: "exact", n: 2 }] },
      {
        label: "2 prendas con zapatos",
        rules: [
          { kind: "exact", n: 2 },
          { kind: "requireCat", cat: "shoes" },
        ],
      },
    ],
  },
  {
    id: "fulllook",
    emoji: "👑",
    title: "De pies a cabeza",
    prompt: "Un look completo, sin que falte nada.",
    tiers: [
      {
        label: "Blusa + pantalón",
        rules: [
          { kind: "requireCat", cat: "top" },
          { kind: "requireCat", cat: "bottom" },
        ],
      },
      {
        label: "Añade zapatos",
        rules: [
          { kind: "requireCat", cat: "top" },
          { kind: "requireCat", cat: "bottom" },
          { kind: "requireCat", cat: "shoes" },
        ],
      },
      {
        label: "Y un accesorio",
        rules: [
          { kind: "requireCat", cat: "top" },
          { kind: "requireCat", cat: "bottom" },
          { kind: "requireCat", cat: "shoes" },
          { kind: "requireCat", cat: "accessory" },
        ],
      },
    ],
  },
  {
    id: "accessory",
    emoji: "💍",
    title: "El toque final",
    prompt: "Todo outfit brilla con el accesorio correcto.",
    tiers: [
      {
        label: "Incluye un accesorio",
        rules: [{ kind: "requireCat", cat: "accessory" }],
      },
      {
        label: "Accesorio + 2 prendas",
        rules: [
          { kind: "requireCat", cat: "accessory" },
          { kind: "min", n: 2 },
        ],
      },
      {
        label: "Accesorio + 3 prendas",
        rules: [
          { kind: "requireCat", cat: "accessory" },
          { kind: "min", n: 3 },
        ],
      },
    ],
  },
  {
    id: "party",
    emoji: "🎉",
    title: "Lista para la fiesta",
    prompt: "Un look llamativo para brillar en la noche.",
    tiers: [
      { label: "Al menos 3 prendas", rules: [{ kind: "min", n: 3 }] },
      {
        label: "3 prendas + accesorio",
        rules: [
          { kind: "min", n: 3 },
          { kind: "requireCat", cat: "accessory" },
        ],
      },
      {
        label: "Con accesorio y zapatos",
        rules: [
          { kind: "min", n: 3 },
          { kind: "requireCat", cat: "accessory" },
          { kind: "requireCat", cat: "shoes" },
        ],
      },
    ],
  },
  {
    id: "layers",
    emoji: "🎨",
    title: "Mezcla atrevida",
    prompt: "El nivel final: combina muchas piezas con estilo.",
    tiers: [
      { label: "Al menos 3 prendas", rules: [{ kind: "min", n: 3 }] },
      { label: "Al menos 4 prendas", rules: [{ kind: "min", n: 4 }] },
      {
        label: "4 prendas + accesorio",
        rules: [
          { kind: "min", n: 4 },
          { kind: "requireCat", cat: "accessory" },
        ],
      },
    ],
  },
];

export function getChallenge(id: string): Challenge | undefined {
  return CHALLENGES.find((c) => c.id === id);
}

export function challengeIndex(id: string): number {
  return CHALLENGES.findIndex((c) => c.id === id);
}

// ---------- Evaluación ----------

function passesRule(r: Rule, selected: { category: Category }[]): boolean {
  const n = selected.length;
  const has = (c: Category) => selected.some((g) => g.category === c);
  switch (r.kind) {
    case "min":
      return n >= r.n;
    case "max":
      return n >= 1 && n <= r.n;
    case "exact":
      return n === r.n;
    case "requireCat":
      return has(r.cat);
    case "anyCat":
      return r.cats.some(has);
  }
}

export interface TierStatus {
  star: number; // 1, 2 o 3
  label: string;
  done: boolean;
}

/** Evalúa un nivel contra las prendas seleccionadas (en vivo, sin IA). */
export function evalChallenge(
  ch: Challenge,
  selected: { category: Category }[],
): { tiers: TierStatus[]; stars: number; complete: boolean } {
  const tiers: TierStatus[] = ch.tiers.map((t, i) => ({
    star: i + 1,
    label: t.label,
    done: selected.length >= 1 && t.rules.every((r) => passesRule(r, selected)),
  }));
  const stars = tiers.filter((t) => t.done).length;
  return { tiers, stars, complete: stars >= 1 };
}

// ---------- Persistencia (localStorage) ----------

export interface ChallengeResult {
  stars: number;
  completedAt: number;
}
export type Progress = Record<string, ChallengeResult>;

const keyFor = (ns?: string) => `glamour:challenges${ns ? ":" + ns : ""}`;
const UPDATE_EVENT = "glamour:challenges-updated";

export function loadProgress(ns?: string): Progress {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(keyFor(ns)) || "{}") as Progress;
  } catch {
    return {};
  }
}

/** Guarda el resultado (conserva el mejor) y devuelve el progreso actualizado. */
export function saveResult(id: string, stars: number, ns?: string): Progress {
  const p = loadProgress(ns);
  if (!p[id] || p[id].stars < stars) {
    p[id] = { stars, completedAt: Date.now() };
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(keyFor(ns), JSON.stringify(p));
        // Notifica a la misma pestaña (el evento "storage" solo cruza pestañas).
        window.dispatchEvent(new Event(UPDATE_EVENT));
      } catch {
        // ignorar (modo incógnito / sin espacio)
      }
    }
  }
  return p;
}

// ---------- Desbloqueo (modo historia) ----------

/** Un nivel está desbloqueado si es el primero o el anterior tiene ≥1★. */
export function isUnlocked(index: number, progress: Progress): boolean {
  if (index <= 0) return true;
  const prev = CHALLENGES[index - 1];
  return !!progress[prev.id];
}

// ---------- Hook reactivo (useSyncExternalStore) ----------

const EMPTY_PROGRESS: Progress = {};
let snapCache: { raw: string; value: Progress } = { raw: " ", value: {} };

function progressSnapshot(ns?: string): Progress {
  if (typeof window === "undefined") return EMPTY_PROGRESS;
  const raw = localStorage.getItem(keyFor(ns)) ?? "";
  if (raw !== snapCache.raw) {
    let value: Progress = {};
    try {
      value = raw ? (JSON.parse(raw) as Progress) : {};
    } catch {
      value = {};
    }
    snapCache = { raw, value };
  }
  return snapCache.value;
}

function subscribeProgress(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", cb);
  window.addEventListener(UPDATE_EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(UPDATE_EVENT, cb);
  };
}

export function useChallengeProgress(ns?: string): Progress {
  return useSyncExternalStore(
    subscribeProgress,
    () => progressSnapshot(ns),
    () => EMPTY_PROGRESS,
  );
}

export function totalStars(p: Progress): number {
  return Object.values(p).reduce((sum, r) => sum + r.stars, 0);
}

export const MAX_STARS = CHALLENGES.length * MAX_STARS_PER_LEVEL;
