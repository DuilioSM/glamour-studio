import { generateText } from "ai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;

const MODEL =
  process.env.GEMINI_CLASSIFY_MODEL ?? "google/gemini-2.5-flash-lite";

const VALID = ["top", "bottom", "dress", "shoes", "accessory", "other"] as const;
type Cat = (typeof VALID)[number];

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let image: string | undefined;
  try {
    ({ image } = (await req.json()) as { image?: string });
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (!image) {
    return NextResponse.json({ error: "Falta la imagen." }, { status: 400 });
  }

  const prompt = [
    "Classify the single clothing item or accessory shown in this image into EXACTLY one category.",
    "Answer with ONLY one lowercase token, nothing else:",
    "- top  -> upper-body garments: shirts, blouses, t-shirts, tops, sweaters, hoodies, jackets, coats",
    "- bottom -> lower-body garments: pants, jeans, trousers, shorts, skirts, leggings",
    "- dress -> one-piece garments: dresses, gowns, jumpsuits, rompers, overalls",
    "- shoes -> any footwear: heels, sneakers, boots, sandals, flats",
    "- accessory -> bags, purses, hats, belts, scarves, jewelry, sunglasses, gloves",
    "- other -> anything that doesn't clearly fit the above",
    "Respond with just one of: top, bottom, dress, shoes, accessory, other.",
  ].join("\n");

  try {
    const result = await generateText({
      model: MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image", image },
          ],
        },
      ],
    });

    const raw = result.text.trim().toLowerCase();
    const match = VALID.find((c) => raw.includes(c)) ?? "other";
    return NextResponse.json({ category: match as Cat });
  } catch (err) {
    console.error("[classify] error:", err);
    // No es crítico: si falla, se queda en "other".
    return NextResponse.json({ category: "other" as Cat });
  }
}
