// Todos los tiempos de la app en un solo lugar. Ajustarlos tras probar en dispositivos reales.

// Coordinación con el lector de pantalla
export const PHASE_FOCUS_DELAY_MS = 350;            // esperar a que se monte la tarjeta nueva
export const SCREEN_READER_ANNOUNCE_DELAY_MS = 800; // anunciar después de leer el título enfocado
export const SCREEN_READER_RECORD_DELAY_MS = 1200;  // dejar que el lector termine antes de grabar

// Ventana para confirmar con un segundo toque del botón atrás de Android
export const BACK_CONFIRM_WINDOW_MS = 4000;

// Brújula: margen de alineación y pausas entre indicaciones habladas
export const COMPASS_ALIGNED_DEG = 20;
export const COMPASS_HINT_INTERVAL_MS = 2500;
export const COMPASS_INTRO_QUIET_MS = 8000;
