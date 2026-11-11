const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateBearing, calculateHaversine, walkingBearing } = require('../src/utils/geo');

// Plaza de Armas de Trujillo
const plaza = [-8.1116, -79.0288];

test('bearing points to the cardinal directions', () => {
  assert.ok(Math.abs(calculateBearing(...plaza, plaza[0] + 0.01, plaza[1]) - 0) < 0.5);
  assert.ok(Math.abs(calculateBearing(...plaza, plaza[0], plaza[1] + 0.01) - 90) < 0.5);
  assert.ok(Math.abs(calculateBearing(...plaza, plaza[0] - 0.01, plaza[1]) - 180) < 0.5);
  assert.ok(Math.abs(calculateBearing(...plaza, plaza[0], plaza[1] - 0.01) - 270) < 0.5);
});

test('walking bearing prefers the walking path, falls back to user → stop, never guesses', () => {
  const north = [plaza, [plaza[0] + 0.01, plaza[1]]];
  const eastStop = [plaza[0], plaza[1] + 0.01];
  const user = { lat: plaza[0], lon: plaza[1] };
  assert.ok(Math.abs(walkingBearing({ walking_path: north, boarding_coord: eastStop }, user) - 0) < 0.5);
  assert.ok(Math.abs(walkingBearing({ boarding_coord: eastStop }, user) - 90) < 0.5);
  assert.equal(walkingBearing({ boarding_coord: eastStop }, null), null);
  assert.equal(walkingBearing(undefined, user), null);
  assert.equal(walkingBearing({ walking_path: [plaza] }, null), null);
});

test('haversine distance is zero for the same point and ~111 m per 0.001° of latitude', () => {
  assert.equal(calculateHaversine(...plaza, ...plaza), 0);
  const d = calculateHaversine(...plaza, plaza[0] + 0.001, plaza[1]);
  assert.ok(d > 110 && d < 112, `distance was ${d}`);
});
