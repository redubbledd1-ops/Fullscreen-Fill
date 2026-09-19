/**
 * One handle for the extension APIs.
 *
 * Firefox exposes promise-based `browser.*`; its `chrome.*` alias is
 * callback-based. Chrome/Edge only have `chrome.*`, which returns promises
 * under MV3. Everything in this extension awaits its API calls, so pick
 * `browser` when it exists and fall back to `chrome`.
 */
globalThis.WsFillApi = globalThis.browser ?? globalThis.chrome;
