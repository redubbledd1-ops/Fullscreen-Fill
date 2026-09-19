const ALARM_NAME = "ws-fill-config-refresh";
const DEFAULT_INTERVAL_HOURS = 6;

async function getConfigUrl() {
  const { configUrl } = await chrome.storage.sync.get({ configUrl: "" });
  return (configUrl || "").trim();
}

async function loadDefaults() {
  const res = await fetch(chrome.runtime.getURL("config/defaults.json"));
  return res.json();
}

function isValid(config) {
  if (!config || typeof config !== "object") return false;
  if (typeof config.version !== "number") return false;
  if (
    config.youtube &&
    typeof config.youtube.css === "string" &&
    config.youtube.css.length > 20
  ) {
    return true;
  }
  if (Array.isArray(config.overrides) && config.overrides.length > 0) {
    return true;
  }
  if (config.generic && typeof config.generic === "object") return true;
  return false;
}

function slimResult(result) {
  return {
    ok: Boolean(result?.ok),
    source: result?.source || "",
    error: result?.error || "",
    version: result?.config?.version ?? null,
  };
}

async function refreshConfig({ force = false } = {}) {
  const url = await getConfigUrl();
  const now = Date.now();
  const meta = await chrome.storage.local.get([
    "remoteConfig",
    "configFetchedAt",
    "configFetchError",
    "configSource",
  ]);

  if (!url) {
    const defaults = await loadDefaults();
    await chrome.storage.local.set({
      remoteConfig: defaults,
      configFetchedAt: now,
      configFetchError: "",
      configSource: "bundled",
    });
    return { ok: true, source: "bundled", config: defaults };
  }

  if (!force && meta.configFetchedAt && now - meta.configFetchedAt < 5 * 60 * 1000) {
    return { ok: true, source: "cache", config: meta.remoteConfig };
  }

  try {
    const res = await fetch(`${url}${url.includes("?") ? "&" : "?"}t=${now}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!isValid(json)) throw new Error("Ongeldige config");

    await chrome.storage.local.set({
      remoteConfig: json,
      configFetchedAt: now,
      configFetchError: "",
      configSource: "remote",
    });
    return { ok: true, source: "remote", config: json };
  } catch (err) {
    const fallback = isValid(meta.remoteConfig)
      ? meta.remoteConfig
      : await loadDefaults();
    await chrome.storage.local.set({
      remoteConfig: fallback,
      configFetchedAt: now,
      configFetchError: String(err.message || err),
      configSource: isValid(meta.remoteConfig) ? "cache" : "bundled",
    });
    return { ok: false, error: String(err.message || err), config: fallback };
  }
}

function safeRefresh(force) {
  refreshConfig({ force }).catch(() => {
    /* ignore startup / alarm failures */
  });
}

chrome.runtime.onInstalled.addListener(() => {
  try {
    chrome.alarms.create(ALARM_NAME, {
      periodInMinutes: DEFAULT_INTERVAL_HOURS * 60,
    });
  } catch {
    /* ignore */
  }
  safeRefresh(true);
});

chrome.runtime.onStartup.addListener(() => {
  safeRefresh(true);
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) safeRefresh(true);
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "refreshConfig") return false;

  refreshConfig({ force: true })
    .then((result) => {
      try {
        sendResponse(slimResult(result));
      } catch {
        /* port closed */
      }
    })
    .catch((err) => {
      try {
        sendResponse({
          ok: false,
          source: "",
          error: String(err?.message || err),
          version: null,
        });
      } catch {
        /* port closed */
      }
    });

  return true;
});

safeRefresh(false);
