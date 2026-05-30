import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const maxDuration = 30;

const BUCKET = "wardrobe";
const MAX_BYTES = 12 * 1024 * 1024; // 12 MB

// La extensión llama desde otro origen: respondemos con CORS abierto. (Las
// peticiones desde el service worker con host_permissions no exigen CORS, pero
// así también funciona desde páginas/orígenes web.)
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: CORS });
}

export async function POST(req: Request) {
  // 1) Token del usuario (Bearer) que envía la extensión.
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : "";
  if (!token) return json({ error: "Falta el token de sesión." }, 401);

  // Cliente Supabase autenticado COMO el usuario -> respeta RLS al subir/insertar.
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser(token);
  if (userErr || !user) {
    return json({ error: "Sesión inválida o expirada." }, 401);
  }

  // 2) Payload de la extensión.
  let imageUrl: string | undefined;
  let name: string | undefined;
  let source: string | undefined;
  try {
    ({ imageUrl, name, source } = (await req.json()) as {
      imageUrl?: string;
      name?: string;
      source?: string;
    });
  } catch {
    return json({ error: "JSON inválido." }, 400);
  }
  if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) {
    return json({ error: "Falta una URL de imagen válida." }, 400);
  }

  // 3) Descargamos la imagen en el servidor (evita CORS/hotlink del navegador).
  let bytes: Uint8Array;
  let contentType: string;
  try {
    const res = await fetch(imageUrl, {
      headers: {
        // Algunas CDNs de tiendas bloquean peticiones sin UA/referer "de navegador".
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/png,image/jpeg,*/*",
        Referer: source ?? new URL(imageUrl).origin,
      },
    });
    if (!res.ok) {
      return json({ error: `No se pudo descargar la imagen (${res.status}).` }, 502);
    }
    contentType = res.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) {
      return json({ error: "La URL no apunta a una imagen." }, 415);
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength === 0) return json({ error: "Imagen vacía." }, 502);
    if (buf.byteLength > MAX_BYTES) {
      return json({ error: "La imagen es demasiado grande." }, 413);
    }
    bytes = new Uint8Array(buf);
  } catch (e) {
    console.error("[import] fetch image:", e);
    return json({ error: "No se pudo descargar la imagen." }, 502);
  }

  // 4) Subimos la imagen CRUDA a Storage (la web app le quitará el fondo luego).
  const path = `${user.id}/garments/${crypto.randomUUID()}.img`;
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType, upsert: false });
  if (upErr) {
    console.error("[import] upload:", upErr);
    return json({ error: "No se pudo guardar la imagen." }, 500);
  }

  // 5) Insertamos la fila como PENDIENTE (la web la procesa al cargar).
  const cleanName = (name ?? "Prenda").trim().slice(0, 40) || "Prenda";
  const { data, error: dbErr } = await supabase
    .from("garments")
    .insert({
      user_id: user.id,
      storage_path: path,
      category: "other",
      name: cleanName,
      pending: true,
    })
    .select("id")
    .single();
  if (dbErr) {
    console.error("[import] insert:", dbErr);
    // Limpiamos el archivo huérfano si la fila no entró.
    await supabase.storage.from(BUCKET).remove([path]);
    return json({ error: "No se pudo registrar la prenda." }, 500);
  }

  return json({ ok: true, id: data.id, name: cleanName });
}
