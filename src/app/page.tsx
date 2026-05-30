"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PrimaryButton, GhostButton } from "@/components/ui";
import { LogoutButton } from "@/components/LogoutButton";
import {
  useChallengeProgress,
  totalStars,
  MAX_STARS,
} from "@/lib/challenges";

export default function Home() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [name, setName] = useState<string>("");
  const progress = useChallengeProgress();
  const stars = totalStars(progress);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      setAuthed(!!u);
      if (u) {
        const meta = (u.user_metadata?.name as string | undefined) ?? undefined;
        setName(meta || u.email || "Mi perfil");
      }
    });
  }, []);

  return (
    <>
      {/* Barra superior: perfil / sesión */}
      <header className="flex items-center justify-end gap-3 px-5 py-4">
        {authed === true && (
          <>
            <span className="flex items-center gap-2 rounded-full border-2 border-white bg-white/70 px-4 py-2 text-sm font-semibold text-pink-dark backdrop-blur">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-pink text-xs text-white">
                {name.charAt(0).toUpperCase() || "👤"}
              </span>
              <span className="max-w-[12rem] truncate">{name}</span>
            </span>
            <LogoutButton />
          </>
        )}
        {authed === false && (
          <Link href="/login">
            <GhostButton>Iniciar sesión</GhostButton>
          </Link>
        )}
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-12 text-center">
      <div className="animate-float text-7xl">👗✨</div>
      <h1 className="mt-4 font-display text-5xl font-extrabold text-pink-dark drop-shadow-sm sm:text-6xl">
        Glamour Studio
      </h1>
      <p className="mt-3 max-w-md text-lg text-foreground/70">
        Viste tu avatar con tu ropa real y deja que la IA genere tu look. 💕
      </p>

      {/* Invitado: CTA para entrar */}
      {authed === false && (
        <div className="mt-10 flex flex-col items-center gap-4">
          <Link href="/login">
            <PrimaryButton className="text-xl">Empezar ✨</PrimaryButton>
          </Link>
          <Link
            href="/login"
            className="text-sm font-semibold text-pink-dark/70 underline-offset-4 hover:underline"
          >
            Ya tengo cuenta — Entrar
          </Link>
        </div>
      )}

      {/* Con sesión: menú de modos estilo videojuego */}
      {authed === true && (
        <div className="mt-10 grid w-full max-w-3xl gap-5 sm:grid-cols-2">
          <ModeCard
            href="/play"
            emoji="🎨"
            title="Modo Libre"
            desc="Crea sin límites. Viste tu avatar como quieras y guarda tus looks."
            cta="Jugar libre"
            accent="from-pink-soft/70 to-white"
          />
          <ModeCard
            href="/challenges"
            emoji="🗺️"
            title="Modo Historia"
            desc="Supera niveles de outfit y consigue las 3 estrellas de cada uno."
            cta="Ver niveles"
            accent="from-lilac/30 to-white"
            badge={
              <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-sm font-bold text-pink-dark shadow">
                ⭐ {stars} / {MAX_STARS}
              </span>
            }
          />
        </div>
      )}

      {/* Placeholder mientras se resuelve la sesión */}
      {authed === null && (
        <div className="mt-12 h-10 w-10 animate-spin-slow rounded-full border-4 border-pink-soft border-t-pink" />
      )}

      {/* Pasos (solo para invitados, como intro) */}
      {authed === false && (
        <div className="mt-14 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { e: "📸", t: "1. Tu foto", d: "Sube una foto de cuerpo completo" },
            { e: "🧥", t: "2. Tu ropa", d: "Sube hasta 10 prendas que uses" },
            { e: "🪄", t: "3. ¡Vístete!", d: "Arrastra y genera tu look con IA" },
          ].map((s) => (
            <div
              key={s.t}
              className="rounded-3xl border-2 border-white bg-white/60 p-5 backdrop-blur"
            >
              <div className="text-4xl">{s.e}</div>
              <div className="mt-2 font-display text-lg font-bold text-pink-dark">
                {s.t}
              </div>
              <div className="text-sm text-foreground/60">{s.d}</div>
            </div>
          ))}
        </div>
      )}
      </main>
    </>
  );
}

function ModeCard({
  href,
  emoji,
  title,
  desc,
  cta,
  accent,
  badge,
}: {
  href: string;
  emoji: string;
  title: string;
  desc: string;
  cta: string;
  accent: string;
  badge?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`group flex flex-col items-center rounded-[2rem] border-4 border-white bg-gradient-to-b ${accent} p-7 text-center shadow-xl transition hover:-translate-y-1 hover:shadow-2xl`}
    >
      <div className="text-6xl transition group-hover:scale-110">{emoji}</div>
      <h2 className="mt-3 font-display text-2xl font-extrabold text-pink-dark">
        {title}
      </h2>
      {badge && <div className="mt-2">{badge}</div>}
      <p className="mt-2 flex-1 text-sm text-foreground/60">{desc}</p>
      <span className="mt-5 rounded-full bg-pink px-6 py-3 font-display text-lg font-bold text-white shadow-[0_5px_0_var(--pink-dark)] transition group-active:translate-y-0.5 group-active:shadow-[0_2px_0_var(--pink-dark)]">
        {cta} →
      </span>
    </Link>
  );
}
