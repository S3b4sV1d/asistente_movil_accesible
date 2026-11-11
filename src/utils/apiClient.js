/**
 * @param {string[]} urls
 * @param {string} sessionId
 * @param {typeof fetch} fetchImpl
 */
function createApiClient(urls, sessionId, fetchImpl = fetch) {
  /** @param {string} endpoint @param {RequestInit & {timeoutMs?: number}} options */
  return async function apiFetch(endpoint, options = {}) {
    const { timeoutMs = 15000, signal, ...requestOptions } = options;
    let lastError;
    for (const url of urls) {
      if (signal?.aborted) throw new Error('Solicitud cancelada');
      const controller = new AbortController();
      const cancel = () => controller.abort();
      signal?.addEventListener('abort', cancel, { once: true });
      const timer = setTimeout(cancel, timeoutMs);
      try {
        const headers = new Headers(requestOptions.headers);
        headers.set('X-Session-ID', sessionId);
        const response = await fetchImpl(`${url}${endpoint}`, {
          ...requestOptions, headers, signal: controller.signal,
        });
        // Consume the body before clearing the timeout; a stalled body must expire too.
        const body = await response.text();
        if (response.ok) return { json: async () => JSON.parse(body), status: response.status };
        lastError = new Error(`Servidor respondió ${response.status}`);
        if (response.status < 500) throw Object.assign(lastError, { noRetry: true });
      } catch (error) {
        lastError = error;
        if (signal?.aborted || (error instanceof Error && 'noRetry' in error && error.noRetry)) throw error;
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', cancel);
      }
    }
    throw lastError || new Error('No hay servidor configurado');
  };
}
module.exports = { createApiClient };
