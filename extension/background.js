// Service worker: guarda la sesión, refresca el token y hace las importaciones.
importScripts("config.js");

const CFG = self.GLAMOUR_CONFIG;

// ---------- Sesión / token ----------
async function getSession() {
  const { session } = await chrome.storage.local.get("session");
  return session ?? null;
}

async function setSession(session) {
  await chrome.storage.local.set({ session });
}

async function clearSession() {
  await chrome.storage.local.remove("session");
}

// Refresca el access_token con el refresh_token si está por expirar.
async function getValidAccessToken() {
  const session = await getSession();
  if (!session?.access_token) throw new Error("not-connected");

  const now = Math.floor(Date.now() / 1000);
  if (session.expires_at && session.expires_at - 60 > now) {
    return session.access_token;
  }

  // Token vencido o por vencer -> refrescar.
  const res = await fetch(
    `${CFG.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: CFG.SUPABASE_KEY,
      },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    },
  );
  if (!res.ok) {
    await clearSession();
    throw new Error("session-expired");
  }
  const data = await res.json();
  const next = {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? session.refresh_token,
    expires_at:
      data.expires_at ??
      (data.expires_in ? now + data.expires_in : session.expires_at),
    email: session.email,
  };
  await setSession(next);
  return next.access_token;
}

// ---------- Importar una prenda ----------
async function importGarment({ imageUrl, name, source }) {
  const token = await getValidAccessToken();
  const res = await fetch(`${CFG.APP_URL}/api/import`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ imageUrl, name, source }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

function notify(title, message, isError) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon128.png",
    title,
    message,
    priority: isError ? 2 : 0,
  });
}

async function handleImport(payload) {
  try {
    const data = await importGarment(payload);
    notify("👗 Prenda añadida", `“${data.name}” está en tu guardarropa.`);
    return { ok: true, data };
  } catch (e) {
    const msg = String(e.message || e);
    if (msg === "not-connected" || msg === "session-expired") {
      notify(
        "Conecta tu cuenta",
        "Abre el popup de Glamour Studio y pulsa “Conectar cuenta”.",
        true,
      );
      return { ok: false, error: "not-connected" };
    }
    notify("No se pudo añadir", msg, true);
    return { ok: false, error: msg };
  }
}

// ---------- Menú contextual sobre imágenes ----------
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "glamour-add-image",
    title: "Añadir imagen a Glamour Studio",
    contexts: ["image"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "glamour-add-image" || !info.srcUrl) return;
  const name = (tab?.title || "Prenda").slice(0, 40);
  handleImport({ imageUrl: info.srcUrl, name, source: tab?.url });
});

// ---------- Mensajes (content scripts + popup) ----------
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "AUTH" && msg.payload) {
    setSession({
      access_token: msg.payload.access_token,
      refresh_token: msg.payload.refresh_token,
      expires_at: msg.payload.expires_at,
      email: msg.payload.email,
    }).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (msg?.type === "IMPORT") {
    handleImport(msg).then(sendResponse);
    return true;
  }

  if (msg?.type === "GET_STATUS") {
    getSession().then((s) =>
      sendResponse({ connected: !!s?.access_token, email: s?.email ?? null }),
    );
    return true;
  }

  if (msg?.type === "DISCONNECT") {
    clearSession().then(() => sendResponse({ ok: true }));
    return true;
  }

  return false;
});
