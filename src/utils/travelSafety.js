// Pure decision helpers shared by the UI and regression tests.
/**
 * @param {{classId?: string | null, count?: number, at?: number}} previous
 * @param {{status: string, class_id?: string, is_vehicle?: boolean, uncertain?: boolean}} result
 * @param {number} now
 */
function updateEvidence(previous, result, now) {
  if (result.status !== 'success' || !result.is_vehicle || result.uncertain) {
    return { classId: null, count: 0, at: now, confirmed: false };
  }
  const same = previous.classId === result.class_id && now - (previous.at || 0) <= 5000;
  const count = same ? (previous.count || 0) + 1 : 1;
  return { classId: result.class_id, count, at: now, confirmed: count >= 2 };
}

// Above this GPS accuracy (meters) arrival alerts are withheld; the UI warns the user.
const MAX_ALERT_ACCURACY_M = 35;

/**
 * @param {{prepare: boolean, near: boolean}} flags
 * @param {number} distance
 * @param {number | null | undefined} accuracy
 */
function nextArrivalAlert(flags, distance, accuracy) {
  if (!Number.isFinite(distance) || distance < 0 || typeof accuracy !== 'number' || !Number.isFinite(accuracy) || accuracy < 0 || accuracy > MAX_ALERT_ACCURACY_M) return null;
  if (distance <= 45 && !flags.near) return 'near';
  if (distance <= 300 && distance > 45 && !flags.prepare && !flags.near) return 'prepare';
  return null;
}
module.exports = { updateEvidence, nextArrivalAlert, MAX_ALERT_ACCURACY_M };
