// Fases del viaje. Los valores son los mismos strings de siempre.
// IDLE -> (CONFIRM_ORIGIN) -> ROUTE_FOUND -> (COMPASS_WALKING) -> CAMERA_DETECTION -> ONBOARD_GPS
export const PHASES = {
  IDLE: "IDLE",
  CONFIRM_ORIGIN: "CONFIRM_ORIGIN",
  ROUTE_FOUND: "ROUTE_FOUND",
  COMPASS_WALKING: "COMPASS_WALKING",
  CAMERA_DETECTION: "CAMERA_DETECTION",
  ONBOARD_GPS: "ONBOARD_GPS",
};

// Pasos que ve el usuario en el indicador "Paso N de 4"
export const STEPS = [
  { title: "Elegir destino", phases: [PHASES.IDLE, PHASES.CONFIRM_ORIGIN] },
  { title: "Ir al paradero", phases: [PHASES.ROUTE_FOUND, PHASES.COMPASS_WALKING] },
  { title: "Identificar tu vehículo", phases: [PHASES.CAMERA_DETECTION] },
  { title: "Viaje a bordo", phases: [PHASES.ONBOARD_GPS] },
];

// Fases en las que la pantalla debe seguir encendida (el GPS y los sensores solo funcionan con la app abierta)
export const KEEP_AWAKE_PHASES = [PHASES.COMPASS_WALKING, PHASES.CAMERA_DETECTION, PHASES.ONBOARD_GPS];

// Fases en las que el usuario está pidiendo o confirmando el destino (voz o texto)
export const QUERY_PHASES = [PHASES.IDLE, PHASES.CONFIRM_ORIGIN];
