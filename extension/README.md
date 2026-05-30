# Glamour Studio — Extensión (Chrome / Edge)

Añade prendas de Amazon, Zara, Bershka y más a tu guardarropa de Glamour Studio
con un clic.

## Cómo funciona

1. En una página de producto verás un botón flotante **＋ Glamour** (o haz clic
   derecho sobre cualquier imagen → **“Añadir imagen a Glamour Studio”**, o usa
   **＋ Añadir esta página** desde el popup).
2. La extensión manda la imagen al endpoint `POST /api/import` de la app con tu
   token de sesión. El servidor descarga la imagen y la guarda como prenda
   **pendiente**.
3. La próxima vez que abras tu guardarropa (`/play`), la app le quita el fondo,
   la clasifica (top, bottom, vestido…) y la deja lista. Verás un spinner
   “Procesando” sobre la prenda mientras tanto.

## Instalación (modo desarrollador)

1. La extensión ya apunta a producción
   (`https://glamour-studio-omega.vercel.app` en `config.js`). Para usarla contra
   un backend local, cambia `APP_URL` a `http://localhost:3000`.
   - Local y producción comparten el mismo Supabase, así que las prendas que
     importes aparecen en tu guardarropa estés donde estés.
   - Si usas otro dominio, añádelo también en `manifest.json` (`host_permissions`
     y el primer `content_scripts.matches` de `/extension/connect`).
2. Abre `chrome://extensions`, activa **Modo de desarrollador**, pulsa **Cargar
   sin empaquetar** y selecciona esta carpeta `extension/`.

> ⚠️ **Importante:** producción debe tener desplegado el código nuevo
> (`/api/import`, `/extension/connect`, los cambios de `/play`). Si acabas de
> hacer estos cambios en local, haz deploy a Vercel antes de probar la extensión
> contra producción.

## Conectar tu cuenta

1. Inicia sesión en la app.
2. Abre el popup de la extensión → **Conectar cuenta** (abre
   `/extension/connect`).
3. Esa página entrega tu token a la extensión. El token se refresca solo cuando
   expira; solo necesitas reconectar si cierras sesión.

> Las keys de Supabase incluidas en `config.js` son **públicas** (publishable):
> no dan acceso a nada sin la sesión del usuario (RLS).

## Tiendas soportadas (botón flotante)

Amazon, Zara, Bershka, Pull&Bear, Stradivarius, H&M, SHEIN. En cualquier otra
web puedes usar el **clic derecho sobre la imagen** o **＋ Añadir esta página**.

## Archivos

| Archivo              | Rol                                                        |
| -------------------- | ---------------------------------------------------------- |
| `manifest.json`      | Manifest V3 (permisos, content scripts, popup).            |
| `config.js`          | URL de la app + keys públicas de Supabase.                 |
| `background.js`      | Service worker: sesión, refresh de token, importar, menú.  |
| `content_store.js`   | Botón flotante + extracción de la imagen en las tiendas.   |
| `content_connect.js` | Captura el token en `/extension/connect`.                  |
| `popup.html/js`      | Estado de conexión y acciones rápidas.                     |
