// Cálculos geográficos puros (sin React), compartidos por la UI y las pruebas.
/** @param {number} deg */
const toRad = (deg) => (deg * Math.PI) / 180;

/**
 * Rumbo inicial de un punto a otro, en grados (0 = norte, 90 = este).
 * @param {number} lat1 @param {number} lon1 @param {number} lat2 @param {number} lon2
 */
function calculateBearing(lat1, lon1, lat2, lon2) {
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
            Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
  const b = Math.atan2(y, x) * 180 / Math.PI;
  return (b + 360) % 360;
}

/**
 * Distancia en línea recta (fórmula Haversine), en metros.
 * @param {number} lat1 @param {number} lon1 @param {number} lat2 @param {number} lon2
 */
function calculateHaversine(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const dPhi = toRad(lat2 - lat1);
  const dLambda = toRad(lon2 - lon1);
  const a =
    Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Rumbo de caminata hacia el paradero de subida.
 * Usa el primer tramo de la ruta peatonal; si no hay, va de la ubicación actual al paradero.
 * Devuelve null si no hay datos suficientes (la brújula no debe adivinar).
 * @param {{walking_path?: number[][], boarding_coord?: number[]} | null | undefined} walk
 * @param {{lat: number, lon: number} | null | undefined} userLocation
 * @returns {number | null}
 */
function walkingBearing(walk, userLocation) {
  let bearing = null;
  if (Array.isArray(walk?.walking_path) && walk.walking_path.length >= 2) {
    const [p1, p2] = walk.walking_path;
    bearing = calculateBearing(p1[0], p1[1], p2[0], p2[1]);
  } else if (userLocation && Array.isArray(walk?.boarding_coord) && walk.boarding_coord.length === 2) {
    bearing = calculateBearing(userLocation.lat, userLocation.lon, walk.boarding_coord[0], walk.boarding_coord[1]);
  }
  return bearing !== null && Number.isFinite(bearing) ? bearing : null;
}

module.exports = { calculateBearing, calculateHaversine, walkingBearing };
