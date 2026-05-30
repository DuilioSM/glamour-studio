"use client";

import { useState } from "react";
import { clsx } from "@/lib/clsx";

export function AvatarStage({
  image,
  loading,
  onDropGarment,
}: {
  image: string | null;
  loading: boolean;
  onDropGarment: (id: string) => void;
}) {
  const [over, setOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const id = e.dataTransfer.getData("text/garment-id");
        if (id) onDropGarment(id);
      }}
      className={clsx(
        "relative mx-auto flex aspect-[3/4] w-full max-w-sm items-center justify-center overflow-hidden rounded-[2rem] border-4 bg-gradient-to-b from-pink-soft/40 to-white shadow-xl transition",
        over
          ? "scale-[1.02] border-lilac ring-4 ring-lilac/30"
          : "border-white",
      )}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt="Avatar"
          className="h-full w-full object-contain"
          draggable={false}
        />
      ) : (
        <span className="px-6 text-center text-pink-dark/60">
          Tu avatar aparecerá aquí
        </span>
      )}

      {/* Pista de drop */}
      {over && !loading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-lilac/10 font-display text-2xl font-bold text-lilac">
          Suéltalo aquí ✨
        </div>
      )}

      {/* Overlay de carga */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/70 backdrop-blur-sm">
          <div className="h-12 w-12 animate-spin-slow rounded-full border-4 border-pink-soft border-t-pink" />
          <p className="font-display text-lg font-bold text-pink-dark">
            Creando tu look…
          </p>
          <p className="text-xs text-foreground/50">Puede tardar unos segundos</p>
        </div>
      )}
    </div>
  );
}
