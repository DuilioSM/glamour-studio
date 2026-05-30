/**
 * Aplana una imagen (data URL, normalmente PNG transparente) sobre fondo BLANCO
 * y la devuelve como JPEG. Así la IA recibe un fondo blanco explícito (no una
 * transparencia ambigua que interpreta como negro) y mantiene el fondo blanco
 * de forma consistente.
 *
 * `pad` añade un margen blanco alrededor (fracción del lado): le da "aire"
 * arriba/abajo al sujeto para que la IA conserve el cuerpo completo y no recorte.
 */
export function flattenToWhite(dataUrl: string, pad = 0.08): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      const padX = Math.round(w * pad);
      const padY = Math.round(h * pad);
      const canvas = document.createElement("canvas");
      canvas.width = w + padX * 2;
      canvas.height = h + padY * 2;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("No 2d context"));
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, padX, padY, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * Normaliza el encuadre: detecta la silueta (píxeles no-blancos), recorta el
 * espacio sobrante y reescala a la persona para que SIEMPRE ocupe la misma
 * proporción del cuadro. Así el tamaño del sujeto es consistente aunque la IA
 * lo genere pequeño o descentrado. Devuelve WebP.
 */
export function autoFrame(
  dataUrl: string,
  opts: { aspect?: number; fill?: number; threshold?: number; quality?: number } = {},
): Promise<string> {
  const { aspect = 3 / 4, fill = 0.92, threshold = 250, quality = 0.9 } = opts;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      const src = document.createElement("canvas");
      src.width = w;
      src.height = h;
      const sctx = src.getContext("2d");
      if (!sctx) return reject(new Error("No 2d context"));
      sctx.drawImage(img, 0, 0);

      let data: Uint8ClampedArray;
      try {
        data = sctx.getImageData(0, 0, w, h).data;
      } catch {
        return resolve(dataUrl); // imagen "tainted": no podemos analizar -> dejar igual
      }

      // Bounding box de la silueta (ignora blanco y transparente).
      let minX = w,
        minY = h,
        maxX = 0,
        maxY = 0,
        found = false;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          if (data[i + 3] < 10) continue; // transparente
          if (
            data[i] >= threshold &&
            data[i + 1] >= threshold &&
            data[i + 2] >= threshold
          )
            continue; // blanco
          found = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
      if (!found) return resolve(dataUrl);

      // Margen de seguridad (2%) para no recortar bordes claros (p. ej. zapatos
      // blancos sobre fondo blanco, hombros, cabello).
      const mx = Math.round(w * 0.02);
      const my = Math.round(h * 0.02);
      minX = Math.max(0, minX - mx);
      minY = Math.max(0, minY - my);
      maxX = Math.min(w - 1, maxX + mx);
      maxY = Math.min(h - 1, maxY + my);

      const bw = maxX - minX + 1;
      const bh = maxY - minY + 1;

      const outH = 1024;
      const outW = Math.round(outH * aspect);
      const out = document.createElement("canvas");
      out.width = outW;
      out.height = outH;
      const octx = out.getContext("2d");
      if (!octx) return reject(new Error("No 2d context"));
      octx.fillStyle = "#ffffff";
      octx.fillRect(0, 0, outW, outH);

      // Escala para que la silueta llene `fill` del alto (sin exceder el ancho).
      const scale = Math.min((fill * outH) / bh, (fill * outW) / bw);
      const dw = bw * scale;
      const dh = bh * scale;
      octx.drawImage(
        src,
        minX,
        minY,
        bw,
        bh,
        (outW - dw) / 2,
        (outH - dh) / 2,
        dw,
        dh,
      );
      resolve(out.toDataURL("image/webp", quality));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * Redimensiona una imagen (File o data URL) a un lado máximo conservando proporción
 * y la devuelve como data URL JPEG/PNG. Mantiene los payloads pequeños para
 * localStorage/IndexedDB y para abaratar las llamadas a la IA.
 */
export async function fileToResizedDataURL(
  input: File | Blob,
  maxSide = 1024,
  quality = 0.9,
): Promise<string> {
  const dataUrl = await blobToDataURL(input);
  return resizeDataURL(dataUrl, maxSide, quality);
}

/**
 * Procesa una imagen subida: opcionalmente le quita el fondo (deja solo el
 * sujeto/prenda como PNG transparente) y la redimensiona a un lado máximo.
 */
export async function processUpload(
  file: File | Blob,
  maxSide = 1024,
  opts?: { removeBg?: boolean; onProgress?: (fraction: number) => void },
): Promise<string> {
  let blob: File | Blob = file;
  if (opts?.removeBg) {
    const { removeImageBackground } = await import("./bg");
    blob = await removeImageBackground(file, opts.onProgress);
  }
  return fileToResizedDataURL(blob, maxSide);
}

/**
 * Igual que processUpload pero devuelve un Blob PNG listo para subir a Storage.
 */
export async function processUploadBlob(
  file: File | Blob,
  maxSide = 1024,
  opts?: { removeBg?: boolean; onProgress?: (fraction: number) => void },
): Promise<Blob> {
  // 1) Reducimos PRIMERO (rápido, en canvas) para que quitar el fondo procese
  //    muchos menos píxeles.
  const small = await resizeBlob(file, maxSide);
  if (!opts?.removeBg) return small;

  // 2) Quitamos el fondo sobre la imagen ya pequeña.
  const { removeImageBackground } = await import("./bg");
  return removeImageBackground(small, opts.onProgress);
}

/**
 * Redimensiona un Blob y lo devuelve como Blob WebP (conserva transparencia y
 * pesa ~70-80% menos que PNG, así carga mucho más rápido).
 */
export async function resizeBlob(
  blob: Blob,
  maxSide = 1024,
  quality = 0.85,
): Promise<Blob> {
  const dataUrl = await blobToDataURL(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      const scale = Math.min(1, maxSide / Math.max(width, height));
      width = Math.round(width * scale);
      height = Math.round(height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("No 2d context"));
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob falló"))),
        "image/webp",
        quality,
      );
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function resizeDataURL(
  dataUrl: string,
  maxSide = 1024,
  quality = 0.9,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      const scale = Math.min(1, maxSide / Math.max(width, height));
      width = Math.round(width * scale);
      height = Math.round(height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("No 2d context"));
      ctx.drawImage(img, 0, 0, width, height);

      // PNG conserva transparencia (útil para prendas recortadas); si no, JPEG.
      const hasAlpha = dataUrl.startsWith("data:image/png");
      const out = hasAlpha
        ? canvas.toDataURL("image/png")
        : canvas.toDataURL("image/jpeg", quality);
      resolve(out);
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}
