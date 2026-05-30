"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCloset } from "@/lib/store";
import { urlToDataURL } from "@/lib/data";
import { AvatarStage } from "@/components/AvatarStage";
import { Wardrobe } from "@/components/Wardrobe";
import { PrimaryButton, GhostButton } from "@/components/ui";
import { LogoutButton } from "@/components/LogoutButton";

export default function Play() {
  const router = useRouter();
  const loaded = useCloset((s) => s.loaded);
  const loading = useCloset((s) => s.loading);
  const load = useCloset((s) => s.load);
  const avatar = useCloset((s) => s.avatar);
  const garments = useCloset((s) => s.garments);
  const selected = useCloset((s) => s.selected);
  const toggleSelect = useCloset((s) => s.toggleSelect);
  const clearSelection = useCloset((s) => s.clearSelection);
  const looks = useCloset((s) => s.looks);
  const saveLook = useCloset((s) => s.saveLook);
  const removeLook = useCloset((s) => s.removeLook);

  const [stage, setStage] = useState<string | null>(null); // imagen mostrada
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [load]);

  // Redirige a onboarding si falta configuración (tras cargar).
  useEffect(() => {
    if (loaded && (!avatar || garments.length === 0)) {
      router.replace("/onboarding");
    }
  }, [loaded, avatar, garments.length, router]);

  // Inicializa el escenario con el avatar.
  useEffect(() => {
    setStage((cur) => cur ?? avatar?.src ?? null);
  }, [avatar]);

  const selectedGarments = useMemo(
    () => garments.filter((g) => selected.includes(g.id)),
    [garments, selected],
  );

  async function generate() {
    if (!avatar || selectedGarments.length === 0) return;
    setGenerating(true);
    setError(null);
    try {
      // Las imágenes viven en Storage (URL firmada) -> a data URL para la IA.
      const [avatarData, garmentDatas] = await Promise.all([
        urlToDataURL(avatar.src),
        Promise.all(selectedGarments.map((g) => urlToDataURL(g.src))),
      ]);

      const res = await fetch("/api/tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          avatar: avatarData,
          garments: selectedGarments.map((g, i) => ({
            src: garmentDatas[i],
            category: g.category,
            name: g.name,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al generar el look");

      const look = await saveLook(
        data.image,
        selectedGarments.map((g) => g.id),
      );
      setStage(look.src);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo salió mal");
    } finally {
      setGenerating(false);
    }
  }

  if (!loaded) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <div className="h-10 w-10 animate-spin-slow rounded-full border-4 border-pink-soft border-t-pink" />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="font-display text-2xl font-bold text-pink-dark">
          👗 Glamour Studio
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/onboarding?step=2">
            <GhostButton>Mi guardarropa</GhostButton>
          </Link>
          <LogoutButton />
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Columna izquierda: escenario */}
        <section>
          <AvatarStage
            image={stage}
            loading={generating}
            onDropGarment={toggleSelect}
          />

          {/* Editar la persona / avatar */}
          <div className="mt-3 flex justify-center">
            <Link href="/onboarding?step=1">
              <GhostButton>🧍 Cambiar mi foto</GhostButton>
            </Link>
          </div>

          {/* Bandeja de seleccionadas */}
          <div className="mt-4 rounded-3xl border-2 border-white bg-white/70 p-4 backdrop-blur">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-pink-dark">
                Outfit seleccionado ({selectedGarments.length})
              </h3>
              {selectedGarments.length > 0 && (
                <button
                  onClick={clearSelection}
                  className="text-xs font-semibold text-pink-dark/60 hover:text-pink-dark"
                >
                  Limpiar
                </button>
              )}
            </div>

            {selectedGarments.length === 0 ? (
              <p className="mt-2 text-sm text-foreground/50">
                Arrastra prendas a tu avatar o tócalas para añadirlas. 💕
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedGarments.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => toggleSelect(g.id)}
                    title="Quitar"
                    className="relative h-14 w-14 overflow-hidden rounded-xl border-2 border-pink/30 bg-white"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={g.src}
                      alt={g.name}
                      className="h-full w-full object-contain"
                    />
                  </button>
                ))}
              </div>
            )}

            <PrimaryButton
              className="mt-4 w-full"
              disabled={selectedGarments.length === 0 || generating}
              onClick={generate}
            >
              {generating ? "Generando…" : "🪄 Generar look"}
            </PrimaryButton>

            {error && (
              <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            {stage && stage !== avatar?.src && (
              <div className="mt-3 flex gap-2">
                <a
                  href={stage}
                  download={`look-${Date.now()}.png`}
                  className="flex-1 rounded-full border-2 border-pink/40 bg-white px-4 py-2 text-center text-sm font-semibold text-pink-dark hover:border-pink"
                >
                  ⬇️ Descargar
                </a>
                <button
                  onClick={() => avatar && setStage(avatar.src)}
                  className="flex-1 rounded-full border-2 border-pink/40 bg-white px-4 py-2 text-sm font-semibold text-pink-dark hover:border-pink"
                >
                  ↺ Ver original
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Columna derecha: guardarropa */}
        <section className="rounded-3xl border-2 border-white bg-white/60 p-4 backdrop-blur">
          <h2 className="mb-2 font-display text-xl font-bold text-pink-dark">
            👚 Tu guardarropa
          </h2>
          <div className="h-[28rem]">
            <Wardrobe
              garments={garments}
              selected={selected}
              onToggle={toggleSelect}
            />
          </div>
        </section>
      </div>

      {/* Galería de looks generados */}
      {looks.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-xl font-bold text-pink-dark">
            💖 Tus looks {loading && "…"}
          </h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {looks.map((l) => (
              <div
                key={l.id}
                className="group relative aspect-[3/4] overflow-hidden rounded-2xl border-2 border-white bg-white shadow"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={l.src}
                  alt="Look"
                  className="h-full w-full cursor-pointer object-cover"
                  onClick={() => setStage(l.src)}
                />
                <button
                  onClick={() => removeLook(l.id)}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-pink-dark opacity-0 shadow transition group-hover:opacity-100 hover:bg-pink hover:text-white"
                  aria-label="Eliminar look"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
