// ============================================================
// Configuración de la extensión Glamour Studio.
// APP_URL es la app contra la que trabaja la extensión (de dónde toma el token
// en /extension/connect y a dónde manda POST /api/import). Local y producción
// comparten el mismo Supabase, así que cualquiera de las dos funciona.
//   - Producción: https://glamour-studio-omega.vercel.app
//   - Desarrollo: http://localhost:3000
// Si cambias de dominio, recuérdalo también en manifest.json -> host_permissions
// y en el content_script de /extension/connect.
// Las keys de Supabase de abajo son PÚBLICAS (publishable), no hay riesgo en
// incluirlas en la extensión.
// ============================================================
const GLAMOUR_CONFIG = {
  APP_URL: "https://glamour-studio-omega.vercel.app",
  SUPABASE_URL: "https://uugtrgskympwxnyviqqo.supabase.co",
  SUPABASE_KEY: "sb_publishable_d4JCdcGnZaClc4SUiULoiw_9UB1tAAM",
  // Mensaje que usa la página /extension/connect para entregar el token.
  MSG_SOURCE: "glamour-studio-ext",
};

// Disponible tanto en content scripts como en el service worker.
if (typeof self !== "undefined") self.GLAMOUR_CONFIG = GLAMOUR_CONFIG;
