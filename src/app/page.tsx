"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PrimaryButton } from "@/components/ui";

export default function Home() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
  }, []);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="animate-float text-7xl">👗✨</div>
      <h1 className="mt-4 font-display text-5xl font-extrabold text-pink-dark drop-shadow-sm sm:text-6xl">
        Glamour Studio
      </h1>
      <p className="mt-4 max-w-md text-lg text-foreground/70">
        Sube tu foto de cuerpo completo y tu ropa real. Arrastra prendas a tu
        avatar y deja que la IA genere tu look. 💕
      </p>

      <div className="mt-10 flex flex-col items-center gap-4">
        <Link href={authed ? "/play" : "/login"}>
          <PrimaryButton className="text-xl">
            {authed ? "Seguir jugando 👠" : "Empezar ✨"}
          </PrimaryButton>
        </Link>
        {!authed && (
          <Link
            href="/login"
            className="text-sm font-semibold text-pink-dark/70 underline-offset-4 hover:underline"
          >
            Ya tengo cuenta — Entrar
          </Link>
        )}
      </div>

      <div className="mt-16 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
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
    </main>
  );
}
