// Llamadas al backend del asistente. Mismos endpoints y cuerpos JSON de siempre;
// el cliente reintenta en las URLs alternativas y envía la sesión en X-Session-ID.
import { BACKEND_URLS, createSessionId } from "../config/backend";

const { createApiClient } = require("../utils/apiClient");

let apiFetch = createApiClient(BACKEND_URLS, createSessionId());

// Empezar una conversación nueva. Un viaje cancelado nunca reutiliza el estado del servidor,
// aunque el reinicio remoto falle por falta de conexión.
export function newSession() {
  apiFetch = createApiClient(BACKEND_URLS, createSessionId());
}

async function postJson(endpoint, body, options = {}) {
  const res = await apiFetch(endpoint, {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

// Audio grabado (base64) -> respuesta del asistente
export const transcribeVoice = (audioBase64, coords) =>
  postJson("/api/voice/transcribe", { audio_base64: audioBase64, coords });

// Texto (consulta escrita o confirmación) -> respuesta del asistente
export const sendQuery = (query, coords) =>
  postJson("/api/query", { query, coords });

// Foto de la cámara -> vehículo identificado. Se puede cancelar con `signal`.
export const predictVehicle = (imageBase64, routeId, { signal } = {}) =>
  postJson(
    "/api/vision/predict",
    { image_base64: imageBase64, current_route_id: routeId },
    { signal, timeoutMs: 5000 }
  );

// Borrar el estado de la conversación en el servidor
export const resetSession = () => apiFetch("/api/session/reset", { method: "POST" });
