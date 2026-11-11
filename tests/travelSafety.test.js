const test = require('node:test');
const assert = require('node:assert/strict');
const { updateEvidence, nextArrivalAlert } = require('../src/utils/travelSafety');
const { createApiClient } = require('../src/utils/apiClient');
const bus = { status: 'success', class_id: 'cortijo_c1', is_vehicle: true };

test('two consecutive frames; changes, gaps and uncertainty reset evidence', () => {
  let state = {};
  state = updateEvidence(state, bus, 0);
  assert.equal(state.confirmed, false);
  state = updateEvidence(state, bus, 1100);
  assert.equal(state.confirmed, true);
  assert.equal(updateEvidence(state, { ...bus, class_id: 'cortijo_c2' }, 2200).confirmed, false);
  assert.equal(updateEvidence(state, { ...bus, uncertain: true }, 2200).count, 0);
  assert.equal(updateEvidence(state, bus, 9000).count, 1);
});

test('arrival alerts fire once, with accurate GPS and consistent 45m threshold', () => {
  const flags = { prepare: false, near: false };
  assert.equal(nextArrivalAlert(flags, 250, 50), null);
  assert.equal(nextArrivalAlert(flags, 250, 10), 'prepare');
  flags.prepare = true;
  assert.equal(nextArrivalAlert(flags, 250, 10), null);
  assert.equal(nextArrivalAlert(flags, 60, 10), null);
  assert.equal(nextArrivalAlert(flags, 45, 10), 'near');
  flags.near = true;
  assert.equal(nextArrivalAlert(flags, 30, 10), null);
  assert.equal(nextArrivalAlert(flags, 30, null), null);
});

test('timeout releases a stuck request and allows fallback with same session', async () => {
  const calls = [];
  const client = createApiClient(['http://first', 'https://second'], 'test-session', (url, options) => {
    calls.push([url, options.headers.get('X-Session-ID')]);
    if (url.startsWith('http://first')) return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted'))));
    return Promise.resolve({ ok: true, status: 200, text: async () => '{"ok":true}' });
  });
  assert.deepEqual(await (await client('/test', { timeoutMs: 10 })).json(), { ok: true });
  assert.deepEqual(calls.map(x => x[1]), ['test-session', 'test-session']);
});

test('user cancellation never retries and client errors never replay', async () => {
  const controller = new AbortController(); controller.abort();
  let calls = 0;
  const client = createApiClient(['http://one', 'http://two'], 'test-session', async () => {
    calls++;
    return { ok: false, status: 400, text: async () => '{}' };
  });
  await assert.rejects(client('/test', { signal: controller.signal }));
  assert.equal(calls, 0);
  await assert.rejects(client('/test'));
  assert.equal(calls, 1);
});
