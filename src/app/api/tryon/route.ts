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

  // Detecta si hay un vestido / pieza entera (por categoría o por nombre).
  const hasDress = garments.some(
    (g) =>
      g.category === "dress" ||
      /dress|vestido|gown|jumpsuit|romper|overall|enteriz/i.test(g.name ?? ""),
  );

  const prompt = [
    "You are a virtual try-on / fashion stylist image generator.",
    "",
    "The FIRST image is a full-body photo of a person. KEEP THIS EXACT PERSON:",
    "their face, hairstyle, skin tone, body shape, height and pose must stay identical and recognizable.",
    "",
    "The remaining images are the ONLY clothing items / accessories the person should wear now:",
    garmentList,
    "",
    "GOAL: produce ONE photorealistic full-body image of the SAME person wearing a NEW outfit",
    "composed EXCLUSIVELY of the provided garments.",
    "",
    "STRICT RULES (very important):",
    "1. COMPLETELY REMOVE and REPLACE the person's original clothing (the tank top, jeans, etc. in the first photo). None of the original garments may remain visible.",
    "2. The final outfit must consist ONLY of the provided garments (plus the provided shoes/accessories). Do NOT invent extra clothing and do NOT keep any original item.",
    hasDress
      ? "3. A DRESS / one-piece is included: the person must wear ONLY that dress on the torso AND legs. There must be ABSOLUTELY NO pants, jeans, leggings, shorts or skirt visible under or below the dress. Show the bare legs naturally below the hem."
      : "3. If any provided garment is a dress, gown, jumpsuit or one-piece, the person wears ONLY that on torso and legs — no pants/jeans/skirt under or below it; show bare legs below the hem.",
    "4. For body areas not covered by any provided garment, use simple, plain, neutral basics that match the look — never reuse the original patterned clothes (no original jeans, no original top).",
    "5. Dress them realistically: correct fit and drape, natural folds, layering, and shadows/lighting consistent with the body and pose.",
    "",
    "Output: a clean, neutral studio-like background. No text, watermarks, logos, collage or extra people. Return only the final image.",
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
