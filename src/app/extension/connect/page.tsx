"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, PrimaryButton } from "@/components/ui";

// La extensión inyecta un content script en esta página que escucha este
// mensaje y guarda el token. El "source" debe coincidir con el de la extensión.
const MSG_SOURCE = "glamour-studio-ext";

type Status = "loading" | "sent" | "no-session" | "error";

export default function ExtensionConnect() {
  const [status, setStatus] = useState<Status>("loading");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (cancelled) return;
        if (!session) {
          setStatus("no-session");
          return;
        }
        setEmail(session.user.email ?? null);
        // Enviamos el token a la extensión (si está instalada, lo capturará).
        window.postMessage(
          {
            source: MSG_SOURCE,
            type: "AUTH",
            payload: {
              access_token: session.access_token,
              refresh_token: session.refresh_token,
              expires_at: session.expires_at,
              email: session.user.email,
            },
          },
          window.location.origin,
        );
        setStatus("sent");
      } catch (e) {
        console.error("[extension/connect]", e);
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md text-center">
        <div className="text-5xl">🧩</div>
        <h1 className="mt-3 font-display text-2xl font-bold text-pink-dark">
          Conectar la extensión
        </h1>

        {status === "loading" && (
          <p className="mt-3 text-sm text-foreground/60">Conectando…</p>
        )}

        {status === "sent" && (
          <>
            <p className="mt-3 text-sm text-foreground/70">
              ¡Listo{email ? `, ${email}` : ""}! Tu extensión quedó conectada a
              tu guardarropa. Ya puedes ir a Amazon, Zara o Bershka y añadir
              prendas con el botón <strong>＋ Glamour</strong>.
            </p>
            <div className="mt-5">
              <Link href="/play">
                <PrimaryButton>Ir a mi guardarropa</PrimaryButton>
              </Link>
            </div>
            <p className="mt-3 text-xs text-foreground/40">
              ¿No ves confirmación en la extensión? Asegúrate de tenerla
              instalada y vuelve a recargar esta página.
            </p>
          </>
        )}

        {status === "no-session" && (
          <>
            <p className="mt-3 text-sm text-foreground/70">
              Primero inicia sesión para conectar tu extensión.
            </p>
            <div className="mt-5">
              <Link href="/login?next=/extension/connect">
                <PrimaryButton>Iniciar sesión</PrimaryButton>
              </Link>
            </div>
          </>
        )}

        {status === "error" && (
          <p className="mt-3 text-sm text-red-600">
            Algo salió mal al conectar. Recarga la página e inténtalo de nuevo.
          </p>
        )}
      </Card>
    </main>
  );
}
