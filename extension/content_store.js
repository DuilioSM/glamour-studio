// Se inyecta en páginas de tiendas (Amazon, Zara, Bershka, …). Pinta un botón
// flotante "＋ Glamour" que extrae la imagen del producto y la manda a importar.
(function () {
  if (window.__glamourInjected) return;
  window.__glamourInjected = true;

  // ---------- Extracción de la imagen del producto ----------
  function meta(prop) {
    const el =
      document.querySelector(`meta[property="${prop}"]`) ||
      document.querySelector(`meta[name="${prop}"]`);
    return el?.getAttribute("content") || null;
  }

  function bestProductImage() {
    const host = location.hostname;

    // 1) Selectores específicos por tienda (la imagen principal del producto).
    const SITE = [
      { test: /amazon\./, sel: "#landingImage, #imgBlkFront, #main-image" },
      { test: /zara\./, sel: "picture.media-image source, .media-image img, img.media-image__image" },
      { test: /bershka\.|pullandbear\.|stradivarius\./, sel: ".image-zoom img, .product-detail-images img, img" },
      { test: /hm\.|shein\./, sel: "img" },
    ];
    for (const s of SITE) {
      if (s.test.test(host)) {
        const el = document.querySelector(s.sel);
        const url =
          el?.getAttribute("src") ||
          el?.getAttribute("srcset")?.split(" ")[0] ||
          el?.getAttribute("data-src");
        if (url) return absolutize(url);
      }
    }

    // 2) og:image (lo más universal y suele ser la foto principal).
    const og = meta("og:image");
    if (og) return absolutize(og);

    // 3) Fallback: la imagen visible más grande de la página.
    let best = null;
    let bestArea = 0;
    for (const img of document.images) {
      const a = img.naturalWidth * img.naturalHeight;
      if (a > bestArea && img.naturalWidth > 200) {
        bestArea = a;
        best = img.currentSrc || img.src;
      }
    }
    return best ? absolutize(best) : null;
  }

  function absolutize(url) {
    try {
      return new URL(url, location.href).href;
    } catch {
      return url;
    }
  }

  function productName() {
    const h1 = document.querySelector("h1");
    const name =
      meta("og:title") || h1?.textContent?.trim() || document.title || "Prenda";
    return name.replace(/\s+/g, " ").trim().slice(0, 40);
  }

  // ---------- UI: botón flotante + toast ----------
  function toast(text, kind) {
    const t = document.createElement("div");
    t.textContent = text;
    Object.assign(t.style, {
      position: "fixed",
      bottom: "84px",
      right: "20px",
      zIndex: 2147483647,
      maxWidth: "260px",
      padding: "10px 14px",
      borderRadius: "14px",
      font: "600 13px/1.3 system-ui, sans-serif",
      color: "#fff",
      background: kind === "error" ? "#e23d6e" : "#ff5fa2",
      boxShadow: "0 6px 20px rgba(0,0,0,.18)",
      opacity: "0",
      transition: "opacity .2s, transform .2s",
      transform: "translateY(6px)",
    });
    document.body.appendChild(t);
    requestAnimationFrame(() => {
      t.style.opacity = "1";
      t.style.transform = "translateY(0)";
    });
    setTimeout(() => {
      t.style.opacity = "0";
      setTimeout(() => t.remove(), 250);
    }, 3200);
  }

  const btn = document.createElement("button");
  btn.type = "button";
  btn.innerHTML = "＋ Glamour";
  Object.assign(btn.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    zIndex: 2147483647,
    padding: "12px 18px",
    borderRadius: "999px",
    border: "none",
    cursor: "pointer",
    font: "700 14px/1 system-ui, sans-serif",
    color: "#fff",
    background: "linear-gradient(#ff6aa9,#ff4f99)",
    boxShadow: "0 6px 0 #d63a7d, 0 8px 18px rgba(0,0,0,.18)",
  });
  btn.addEventListener("mousedown", () => (btn.style.transform = "translateY(2px)"));
  btn.addEventListener("mouseup", () => (btn.style.transform = ""));

  btn.addEventListener("click", () => {
    const imageUrl = bestProductImage();
    if (!imageUrl) {
      toast("No encontré la imagen del producto 😕", "error");
      return;
    }
    const name = productName();
    btn.disabled = true;
    const original = btn.innerHTML;
    btn.innerHTML = "Añadiendo…";
    chrome.runtime.sendMessage(
      { type: "IMPORT", imageUrl, name, source: location.href },
      (resp) => {
        btn.disabled = false;
        btn.innerHTML = original;
        if (resp?.ok) {
          toast(`“${resp.data?.name || name}” añadida ✨`);
        } else if (resp?.error === "not-connected") {
          toast("Conecta tu cuenta desde el popup de la extensión", "error");
        } else {
          toast(resp?.error || "No se pudo añadir", "error");
        }
      },
    );
  });

  document.body.appendChild(btn);
})();
