import { generateText } from "ai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Generar imágenes puede tardar; ampliamos el tiempo máximo de la función.
export const maxDuration = 120;

const MODEL = process.env.GEMINI_IMAGE_MODEL ?? "google/gemini-2.5-flash-image";

interface GarmentInput {
  src: string; // data URL
  category?: string;
  name?: string;
}

interface Body {
  avatar: string; // data URL
  garments: GarmentInput[];
}

export async function POST(req: Request) {
  // Solo usuarios autenticados pueden generar.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { avatar, garments } = body;
  if (!avatar) {
    return NextResponse.json(
      { error: "Falta la foto del avatar." },
      { status: 400 },
    );
  }
  if (!garments?.length) {
    return NextResponse.json(
      { error: "Selecciona al menos una prenda." },
      { status: 400 },
    );
  }

  const garmentList = garments
    .map(
      (g, i) =>
        `  ${i + 1}. ${g.name || "prenda"}${g.category ? ` (${g.category})` : ""}`,
    )
    .join("\n");

  const prompt = [
    "You are a virtual try-on / fashion stylist image generator.",
    "The FIRST image is a full-body photo of a person. Keep this exact person:",
    "their face, hairstyle, skin tone, body shape and pose must stay identical and recognizable.",
    "",
    "The following images are individual clothing items / accessories:",
    garmentList,
    "",
    "Task: generate ONE new photorealistic full-body image of the SAME person now WEARING all of those clothing items together as a single coherent outfit.",
    "Dress them realistically (correct fit, layering, natural folds, shadows and lighting that match the body).",
    "Replace their current outfit with the provided garments. Keep a clean, neutral studio-like background.",
    "Do not add text, watermarks, logos or extra people. Output only the final image.",
  ].join("\n");

  try {
    const result = await generateText({
      model: MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image", image: avatar },
            ...garments.map((g) => ({ type: "image" as const, image: g.src })),
          ],
        },
      ],
    });

    const imageFile = result.files.find((f) =>
      f.mediaType?.startsWith("image/"),
    );

    if (!imageFile) {
      return NextResponse.json(
        {
          error:
            "El modelo no devolvió una imagen. Intenta de nuevo o con menos prendas.",
          text: result.text,
        },
        { status: 502 },
      );
    }

    // file.base64 NO incluye el prefijo data:, lo añadimos nosotros.
    const dataUrl = `data:${imageFile.mediaType};base64,${imageFile.base64}`;
    return NextResponse.json({ image: dataUrl });
  } catch (err) {
    console.error("[tryon] error:", err);
    const message =
      err instanceof Error ? err.message : "Error generando la imagen.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
