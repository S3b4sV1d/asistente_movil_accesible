/**
 * Tokens de diseño: único origen de colores, tipografía, espaciado y tamaños de toque.
 * Todos los pares texto/fondo cumplen WCAG AA (4.5:1 o más).
 * Los botones de color usan texto blanco con contraste de 5:1 o más.
 */
export const Colors = {
  // Estructura
  appBg: "#F1F5F9",
  surface: "#FFFFFF",
  surfaceMuted: "#F8FAFC",
  border: "#CBD5E1",
  borderSubtle: "#E2E8F0",
  headerBg: "#1E3A8A",
  headerBgDark: "#172554",

  // Texto
  text: "#0F172A",            // 17.9:1 sobre blanco
  textSecondary: "#334155",   // 10.4:1
  textMuted: "#475569",       // 7.6:1
  textOnColor: "#FFFFFF",
  textOnHeader: "#E2E8F0",
  textOnHeaderMuted: "#BFDBFE",

  // Acciones (fondo de botones con texto blanco)
  primary: "#1D4ED8",         // 6.7:1
  success: "#15803D",         // 5.0:1
  warning: "#B45309",         // 5.0:1
  danger: "#B91C1C",          // 6.5:1
  dark: "#0F172A",

  // Tonos de estado (fondo, borde, texto)
  infoBg: "#EFF6FF",
  infoBorder: "#93C5FD",
  infoText: "#1E40AF",
  successBg: "#F0FDF4",
  successBorder: "#16A34A",
  successText: "#166534",
  warningBg: "#FFFBEB",
  warningBorder: "#D97706",
  warningText: "#92400E",
  dangerBg: "#FEF2F2",
  dangerBorder: "#DC2626",
  dangerText: "#991B1B",

  // Indicadores (siempre acompañados de texto, nunca solo color)
  dotGreen: "#22C55E",
  dotYellow: "#F59E0B",
  dotRed: "#EF4444",
};

// Tamaños mínimos: 16 para cuerpo, 14 para texto auxiliar
export const Typography = {
  caption: 14,
  body: 16,
  bodyLarge: 18,
  heading: 20,
  title: 22,
  display: 48,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
};

export const Radius = {
  sm: 10,
  md: 14,
  lg: 16,
};

// Alturas mínimas de toque (dp)
export const Touch = {
  min: 48,      // acciones secundarias
  primary: 56,  // acciones principales
  hero: 72,     // botón de micrófono
};
