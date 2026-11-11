const test = require('node:test');
const assert = require('node:assert/strict');
const { headingDifference, describeCompassTurn } = require('../src/utils/compassGuidance');

test('heading difference wraps to -180..180, positive to the right', () => {
  assert.equal(headingDifference(90, 0), 90);
  assert.equal(headingDifference(0, 90), -90);
  assert.equal(headingDifference(10, 350), 20);
  assert.equal(headingDifference(350, 10), -20);
  assert.equal(headingDifference(180, 0), 180);
});

test('turn guidance uses plain words and clock positions, never degrees', () => {
  assert.deepEqual(describeCompassTurn(30), { key: 'slight-derecha', text: 'Gira un poco a tu derecha.' });
  assert.deepEqual(describeCompassTurn(-30), { key: 'slight-izquierda', text: 'Gira un poco a tu izquierda.' });
  assert.equal(describeCompassTurn(90).text, 'Gira a tu derecha (a tus 3 en punto).');
  assert.equal(describeCompassTurn(-90).text, 'Gira a tu izquierda (a tus 9 en punto).');
  assert.equal(describeCompassTurn(170).key, 'back');
  assert.match(describeCompassTurn(180).text, /a tus 6 en punto/);
  for (const diff of [-179, -100, -50, -21, 21, 50, 100, 179]) {
    assert.doesNotMatch(describeCompassTurn(diff).text, /°/);
  }
});
