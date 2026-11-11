// Indicaciones de la brújula en lenguaje natural (sin grados), compartidas por la UI y las pruebas.

/**
 * Diferencia de rumbo normalizada a -180..180 (positivo = el objetivo está a la derecha).
 * @param {number} targetBearing @param {number} heading
 */
function headingDifference(targetBearing, heading) {
  let diff = (Math.round(targetBearing) - heading + 360) % 360;
  if (diff > 180) diff -= 360;
  return diff;
}

/**
 * Convierte la diferencia de rumbo en una indicación sin grados.
 * `key` agrupa indicaciones equivalentes para no repetirlas.
 * @param {number} diff
 */
function describeCompassTurn(diff) {
  const abs = Math.abs(diff);
  const side = diff > 0 ? "derecha" : "izquierda";
  const hour = ((Math.round(diff / 30) % 12) + 12) % 12 || 12;
  if (abs > 135) return { key: "back", text: `Date la vuelta, el paradero está detrás de ti (a tus ${hour} en punto).` };
  if (abs >= 45) return { key: `side-${side}`, text: `Gira a tu ${side} (a tus ${hour} en punto).` };
  return { key: `slight-${side}`, text: `Gira un poco a tu ${side}.` };
}

module.exports = { headingDifference, describeCompassTurn };
