// URLs del backend, en orden de preferencia. Se configuran con EXPO_PUBLIC_BACKEND_URLS (separadas por comas).
export const BACKEND_URLS = (process.env.EXPO_PUBLIC_BACKEND_URLS || "https://junior-freebsd-tribunal-techniques.trycloudflare.com,http://localhost:8000,http://127.0.0.1:8000")
  .split(",").map((url) => url.trim().replace(/\/$/, "")).filter(Boolean);

// Cada proceso de la app (y cada viaje reiniciado) usa una conversación nueva; no se comparte memoria entre usuarios.
export const createSessionId = () => `mobile-${Date.now()}-${Math.random().toString(36).slice(2)}`;
