# 👗 Glamour Studio

Juego de vestir estilo Friv pero con **virtual try-on real**: la usuaria sube una
foto de cuerpo completo + sus prendas reales, arrastra la ropa a su avatar y la IA
(Google **Gemini 2.5 Flash Image** vía **Vercel AI Gateway**) genera cómo se le ve
el outfit puesto.

## Cómo funciona

1. **Onboarding** (`/onboarding`)
   - Subes 1 foto de cuerpo completo (tu avatar).
   - Subes hasta 10 prendas y les asignas categoría (blusa, pantalón, zapatos…).
   - **Quita el fondo automáticamente** (en el navegador, sin API): deja solo a
     la persona o la prenda como PNG transparente. Se puede desactivar con un
     toggle.
2. **Jugar** (`/play`)
   - Arrastras prendas (o las tocas) para armar tu outfit.
   - Pulsas **🪄 Generar look** → 1 llamada a la IA crea la imagen final.
   - Guardas/descargas tus looks; quedan en una galería.

Las fotos se redimensionan en el navegador y se guardan **localmente** en
IndexedDB (no se sube nada a un servidor salvo cuando generas un look).

## Configuración

1. Instala dependencias:
   ```bash
   npm install
   ```
2. Crea tu API key de **Vercel AI Gateway**
   (Dashboard → AI Gateway → API Keys) y ponla en `.env.local`:
   ```bash
   AI_GATEWAY_API_KEY=tu_key_aqui
   # opcional, para más calidad:
   # GEMINI_IMAGE_MODEL=google/gemini-3-pro-image
   ```
   > En producción dentro de Vercel no necesitas la key: se usa OIDC automáticamente.
3. Arranca en desarrollo:
   ```bash
   npm run dev
   ```

## Deploy en Vercel

```bash
vercel
```

Añade `AI_GATEWAY_API_KEY` en las variables de entorno del proyecto (o conecta el
AI Gateway desde el dashboard).

## Stack

- Next.js 16 (App Router) + React 19
- Tailwind CSS v4
- Zustand + IndexedDB (`idb-keyval`) para persistencia local
- Vercel AI SDK (`ai`) + AI Gateway → `google/gemini-2.5-flash-image`
- `@imgly/background-removal` para quitar el fondo en el navegador (sin servidor)

## Estructura

```
src/
  app/
    page.tsx            # landing
    onboarding/page.tsx # subir foto + prendas
    play/page.tsx       # UI de vestir
    api/tryon/route.ts  # llamada a la IA (genera el look)
  components/
    AvatarStage.tsx     # escenario + drop zone
    Wardrobe.tsx        # guardarropa con pestañas
    ui.tsx              # botones / cards
  lib/
    store.ts            # estado global (Zustand + IndexedDB)
    image.ts            # redimensionado de imágenes
    types.ts            # tipos y categorías
```

## Notas / próximos pasos

- **Privacidad**: hoy todo vive en el navegador del usuario. Si quieres cuentas y
  sincronización, añade auth (Clerk) + almacenamiento (Vercel Blob).
- **Costo**: cada "Generar look" = 1 imagen de Gemini. Considera límites por usuario.
- **Calidad**: prueba `google/gemini-3-pro-image` para resultados más realistas.
