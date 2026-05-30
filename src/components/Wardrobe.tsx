"use client";

import { useState } from "react";
import { clsx } from "@/lib/clsx";
import { CATEGORIES, type Category, type Garment } from "@/lib/types";

export function Wardrobe({
  garments,
  selected,
  onToggle,
}: {
  garments: Garment[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const [tab, setTab] = useState<Category | "all">("all");

  const visible =
    tab === "all" ? garments : garments.filter((g) => g.category === tab);

  return (
    <div className="flex h-full flex-col">
      {/* Pestañas de categoría */}
      <div className="flex flex-wrap gap-2">
        <TabButton active={tab === "all"} onClick={() => setTab("all")}>
          ✨ Todo
        </TabButton>
        {CATEGORIES.map((c) => {
          const count = garments.filter((g) => g.category === c.id).length;
          if (count === 0) return null;
          return (
            <TabButton
              key={c.id}
              active={tab === c.id}
              onClick={() => setTab(c.id)}
            >
              {c.emoji} {c.label}
            </TabButton>
          );
        })}
      </div>

      {/* Rejilla de prendas */}
      <div className="fancy-scroll mt-3 grid flex-1 grid-cols-2 content-start gap-3 overflow-y-auto pr-1 sm:grid-cols-3">
        {visible.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-foreground/50">
            No hay prendas en esta categoría.
          </p>
        )}
        {visible.map((g) => {
          const isSel = selected.includes(g.id);
          return (
            <button
              key={g.id}
              draggable
              onDragStart={(e) =>
                e.dataTransfer.setData("text/garment-id", g.id)
              }
              onClick={() => onToggle(g.id)}
              title={isSel ? "Quitar del look" : "Añadir al look"}
              className={clsx(
                "group relative aspect-square cursor-grab overflow-hidden rounded-2xl border-2 bg-white p-1 shadow transition active:cursor-grabbing",
                isSel
                  ? "border-pink ring-2 ring-pink/40"
                  : "border-white hover:border-pink/40",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={g.src}
                alt={g.name}
                draggable={false}
                className="h-full w-full rounded-xl object-contain"
              />
              {isSel && (
                <span className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-pink text-xs text-white shadow">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "rounded-full px-3 py-1.5 text-sm font-semibold transition",
        active
          ? "bg-pink text-white shadow"
          : "bg-white/70 text-pink-dark hover:bg-white",
      )}
    >
      {children}
    </button>
  );
}
