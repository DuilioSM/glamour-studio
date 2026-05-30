const CFG = self.GLAMOUR_CONFIG;

const dot = document.getElementById("dot");
const statusText = document.getElementById("statusText");
const addTabBtn = document.getElementById("addTab");
const connectBtn = document.getElementById("connect");
const disconnectBtn = document.getElementById("disconnect");

function render(connected, email) {
  dot.classList.toggle("on", connected);
  statusText.textContent = connected
    ? `Conectado${email ? `: ${email}` : ""}`
    : "Sin conectar";
  connectBtn.textContent = connected ? "Reconectar cuenta" : "Conectar cuenta";
  disconnectBtn.hidden = !connected;
  addTabBtn.disabled = !connected;
  addTabBtn.style.opacity = connected ? "1" : ".5";
}

function refresh() {
  chrome.runtime.sendMessage({ type: "GET_STATUS" }, (resp) => {
    render(!!resp?.connected, resp?.email);
  });
}

connectBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: `${CFG.APP_URL}/extension/connect` });
});

disconnectBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "DISCONNECT" }, refresh);
});

// Extrae imagen + nombre de la pestaña activa (og:image / imagen más grande).
function extractFromPage() {
  const meta = (p) =>
    document.querySelector(`meta[property="${p}"]`)?.content ||
    document.querySelector(`meta[name="${p}"]`)?.content ||
    null;
  let imageUrl = meta("og:image");
  if (!imageUrl) {
    let best = null,
      area = 0;
    for (const img of document.images) {
      const a = img.naturalWidth * img.naturalHeight;
      if (a > area && img.naturalWidth > 200) {
        area = a;
        best = img.currentSrc || img.src;
      }
    }
    imageUrl = best;
  }
  if (imageUrl) {
    try {
      imageUrl = new URL(imageUrl, location.href).href;
    } catch {}
  }
  const name = (
    meta("og:title") ||
    document.querySelector("h1")?.textContent ||
    document.title ||
    "Prenda"
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
  return { imageUrl, name };
}

addTabBtn.addEventListener("click", async () => {
  const original = addTabBtn.textContent;
  addTabBtn.textContent = "Añadiendo…";
  addTabBtn.disabled = true;
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractFromPage,
    });
    if (!result?.imageUrl) {
      statusText.textContent = "No encontré imagen en esta página 😕";
      return;
    }
    chrome.runtime.sendMessage(
      {
        type: "IMPORT",
        imageUrl: result.imageUrl,
        name: result.name,
        source: tab.url,
      },
      (resp) => {
        statusText.textContent = resp?.ok
          ? `Añadida: ${resp.data?.name || result.name} ✨`
          : resp?.error === "not-connected"
            ? "Conecta tu cuenta primero"
            : `Error: ${resp?.error || "desconocido"}`;
      },
    );
  } catch (e) {
    statusText.textContent = "No se pudo leer esta página.";
    console.error(e);
  } finally {
    addTabBtn.textContent = original;
    addTabBtn.disabled = false;
  }
});

refresh();
