// Se inyecta en /extension/connect. Escucha el token que la página publica
// con window.postMessage y lo reenvía al service worker para guardarlo.
(function () {
  const CFG = self.GLAMOUR_CONFIG;

  window.addEventListener("message", (event) => {
    // Solo aceptamos mensajes de la propia página (mismo origen).
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.source !== CFG.MSG_SOURCE || data.type !== "AUTH") return;

    chrome.runtime.sendMessage(
      { type: "AUTH", payload: data.payload },
      () => {
        // Confirmamos a la página que la extensión capturó el token.
        window.postMessage(
          { source: CFG.MSG_SOURCE, type: "AUTH_OK" },
          window.location.origin,
        );
      },
    );
  });
})();
