const enabledEl = document.getElementById("enabled");
const langEl = document.getElementById("uiLang");
const urlEl = document.getElementById("configUrl");
const statusEl = document.getElementById("status");
const refreshBtn = document.getElementById("refresh");
const blacklistInput = document.getElementById("blacklistInput");
const blacklistAdd = document.getElementById("blacklistAdd");
const blacklistList = document.getElementById("blacklistList");
const blacklistSummary = document.getElementById("blacklistSummary");
const blacklistCurrent = document.getElementById("blacklistCurrent");
const currentChoice = document.getElementById("currentChoice");
const currentChoiceText = document.getElementById("currentChoiceText");
const chooseUrl = document.getElementById("chooseUrl");
const chooseDomain = document.getElementById("chooseDomain");
const chooseCancel = document.getElementById("chooseCancel");
const typeList = document.getElementById("typeList");
const reloadTabBtn = document.getElementById("reloadTab");
const typesSummary = document.getElementById("typesSummary");
const currentTypeEl = document.getElementById("currentType");
const modeInputs = document.querySelectorAll('input[name="fillMode"]');
const limitBlock = document.getElementById("limitBlock");
const stretchLimitEl = document.getElementById("stretchLimit");
const overLimitEl = document.getElementById("overLimit");
const FILL_KEYS = Object.keys(WsFillConfig.FILL_DEFAULTS);

let urlBlacklist = [];
let pendingTab = null;
let playerTypes = WsFillConfig.defaultPlayerTypes();
let fill = { ...WsFillConfig.FILL_DEFAULTS };
let currentType = "";
let lastState = null;
let langPref = "auto";
let locale = WsFillI18n.resolveLocale(langPref);

function t(key, vars) {
  return WsFillI18n.t(key, vars, locale);
}

function formatTime(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString(locale);
  } catch {
    return "—";
  }
}

async function storageSet(values) {
  try {
    await WsFillApi.storage.sync.set(values);
  } catch {
    /* ignore quota / context errors */
  }
}

function renderLanguages() {
  langEl.replaceChildren();

  const auto = document.createElement("option");
  auto.value = "auto";
  auto.textContent = `${t("langAuto")} — ${WsFillI18n.localeName(
    WsFillI18n.browserLocale()
  )}`;
  langEl.appendChild(auto);

  for (const code of WsFillI18n.LOCALES) {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = WsFillI18n.localeName(code);
    langEl.appendChild(option);
  }

  langEl.value = langPref;
}

/** Re-render everything that carries text. */
function applyLanguage() {
  locale = WsFillI18n.resolveLocale(langPref);
  document.documentElement.lang = locale;
  WsFillI18n.applyDom(document, locale);
  renderLanguages();
  renderFill();
  renderPlayerTypes();
  renderBlacklist();
  renderCurrentType();
  renderStatus();
}

function fillOption(value, text) {
  const option = document.createElement("option");
  option.value = String(value);
  option.textContent = text;
  return option;
}

/** Mode, stretch limit and what lies past it: the limit only applies to stretch. */
function renderFill() {
  for (const input of modeInputs) input.checked = input.value === fill.fillMode;
  limitBlock.hidden = fill.fillMode !== "stretch";

  stretchLimitEl.replaceChildren(
    ...WsFillConfig.STRETCH_LIMITS.map((n) =>
      fillOption(n, n ? t("limitPercent", { n }) : t("limitNone"))
    )
  );
  stretchLimitEl.value = String(fill.stretchLimit);

  overLimitEl.replaceChildren(
    ...WsFillConfig.OVER_LIMITS.map((value) =>
      fillOption(value, t(value === "bars" ? "overBars" : "overZoom"))
    )
  );
  overLimitEl.value = fill.overLimit;
  overLimitEl.disabled = !fill.stretchLimit;
}

function saveFill(patch) {
  fill = WsFillConfig.normalizeFill({ ...fill, ...patch });
  const values = {};
  for (const key of Object.keys(patch)) values[key] = fill[key];
  storageSet(values);
  renderFill();
}

function typeMessageKey(type) {
  return {
    native: "typeNative",
    mse: "typeMse",
    drm: "typeDrm",
    embed: "typeEmbed",
  }[type];
}

function typeLabel(type) {
  const key = typeMessageKey(type);
  return key ? t(key) : type;
}

function renderPlayerTypes() {
  typeList.replaceChildren();
  const off = WsFillConfig.PLAYER_TYPES.filter((type) => playerTypes[type] === false);
  if (!off.length) typesSummary.textContent = t("types");
  else if (off.length === 1) typesSummary.textContent = t("typesOffOne");
  else typesSummary.textContent = t("typesOff", { n: off.length });

  for (const type of WsFillConfig.PLAYER_TYPES) {
    const label = document.createElement("label");
    if (type === currentType) label.classList.add("current");

    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = playerTypes[type] !== false;
    box.addEventListener("change", () => {
      playerTypes = WsFillConfig.normalizePlayerTypes({
        ...playerTypes,
        [type]: box.checked,
      });
      storageSet({ playerTypes });
      renderPlayerTypes();
    });

    const text = document.createElement("span");
    text.textContent = typeLabel(type);
    label.append(box, text);

    if (type === currentType) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = t("typeBadge");
      label.appendChild(badge);
    }

    typeList.appendChild(label);
  }
}

function saveBlacklist() {
  urlBlacklist = WsFillConfig.normalizeBlacklist(urlBlacklist);
  storageSet({ urlBlacklist });
}

function pushEntry(entry) {
  const value = WsFillConfig.normalizeBlacklistEntry(entry);
  if (!value) return false;
  const exists = urlBlacklist.some(
    (item) => item.toLowerCase() === value.toLowerCase()
  );
  if (exists) return false;
  urlBlacklist.push(value);
  saveBlacklist();
  renderBlacklist();
  return true;
}

function describeEntry(entry) {
  const value = WsFillConfig.normalizeBlacklistEntry(entry);
  if (value.startsWith("ytid:")) {
    return t("entryYoutube", { id: value.slice(5) });
  }
  if (value.startsWith("domain:")) {
    return t("entryDomain", { domain: value.slice(7) });
  }
  if (value.startsWith("page:")) return value.slice(5);
  return value;
}

function renderBlacklist() {
  blacklistList.replaceChildren();
  const count = urlBlacklist.length;
  blacklistSummary.textContent = count
    ? t("blacklistN", { n: count })
    : t("blacklist");

  if (!count) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = t("emptyList");
    blacklistList.appendChild(li);
    return;
  }

  urlBlacklist.forEach((entry, index) => {
    const li = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = describeEntry(entry);
    label.title = entry;
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = t("remove");
    removeBtn.addEventListener("click", () => {
      urlBlacklist.splice(index, 1);
      saveBlacklist();
      renderBlacklist();
    });
    li.append(label, removeBtn);
    blacklistList.appendChild(li);
  });
}

function addBlacklistEntry() {
  pushEntry(blacklistInput.value);
  blacklistInput.value = "";
  blacklistInput.focus();
}

function hideChoice() {
  pendingTab = null;
  currentChoice.classList.remove("visible");
  currentChoice.hidden = true;
}

function showChoice(pageEntry, domainEntry, previewUrl) {
  pendingTab = { pageEntry, domainEntry };
  currentChoiceText.replaceChildren();
  const intro = document.createElement("div");
  intro.textContent = t("blockWhat");
  const urlLine = document.createElement("div");
  urlLine.textContent = t("blockUrlLine", { url: previewUrl });
  const domainLine = document.createElement("div");
  domainLine.textContent = t("blockDomainLine", {
    domain: domainEntry.replace(/^domain:/, ""),
  });
  currentChoiceText.append(intro, urlLine, domainLine);
  currentChoice.hidden = false;
  currentChoice.classList.add("visible");
}

function showChoiceMessage(text, blocked) {
  currentChoiceText.textContent = text;
  currentChoice.hidden = false;
  currentChoice.classList.add("visible");
  chooseUrl.disabled = Boolean(blocked);
  chooseDomain.disabled = Boolean(blocked);
}

function parseTabUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    if (!/^https?:$/i.test(u.protocol)) return null;
    const host = WsFillConfig.stripWww(u.hostname);
    const ytid = WsFillConfig.youtubeVideoIdFromUrl(u);

    let pageEntry;
    let previewUrl;
    if (ytid) {
      pageEntry = `ytid:${ytid}`;
      previewUrl = `https://www.youtube.com/watch?v=${ytid}`;
    } else {
      u.hash = "";
      pageEntry = `page:${u.origin}${u.pathname}${u.search}`;
      previewUrl = `${u.origin}${u.pathname}${u.search}`;
    }

    return {
      pageEntry,
      domainEntry: `domain:${host}`,
      previewUrl,
    };
  } catch {
    return null;
  }
}

async function startCurrentPageBlock() {
  hideChoice();
  chooseUrl.disabled = false;
  chooseDomain.disabled = false;
  try {
    const tabs = await WsFillApi.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (!tab?.url) {
      showChoiceMessage(t("noTabUrl"), false);
      return;
    }
    const parsed = parseTabUrl(tab.url);
    if (!parsed) {
      showChoiceMessage(t("cannotBlock"), true);
      return;
    }
    showChoice(parsed.pageEntry, parsed.domainEntry, parsed.previewUrl);
  } catch (err) {
    showChoiceMessage(t("tabReadError", { err: err?.message || err }), false);
  }
}

function renderCurrentType() {
  if (lastState === null) {
    currentTypeEl.textContent = t("tabBusy");
    return;
  }
  if (lastState === false) {
    currentTypeEl.textContent = t("tabUnknown");
    return;
  }
  if (!lastState.type) {
    currentTypeEl.textContent = t("tabNoPlayer");
    return;
  }

  let why = "whyActive";
  if (!lastState.enabled) why = "whyOff";
  else if (lastState.blacklisted) why = "whyBlacklisted";
  else if (!lastState.typeAllowed) why = "whyType";
  else if (!lastState.active && lastState.fullscreenOnly && !lastState.fullscreen) {
    why = "whyFsOnly";
  } else if (!lastState.active) why = "whyInactive";

  let whyText = t(why);
  const fitKey = { fill: "fitFill", cover: "fitCover", contain: "fitContain" }[
    lastState.fit
  ];
  if (why === "whyActive" && fitKey) {
    const n = lastState.aspectDiff || 0;
    whyText += ` · ${n ? t("fitDiff", { fit: t(fitKey), n }) : t(fitKey)}`;
  }

  currentTypeEl.textContent = t("tabLine", {
    type: typeLabel(lastState.type),
    why: whyText,
  });
}

async function loadCurrentType() {
  try {
    const tabs = await WsFillApi.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (!tab?.id) throw new Error("no tab");
    const state = await WsFillApi.tabs.sendMessage(tab.id, {
      type: "wsFillState",
    });
    lastState = state || false;
    currentType = state?.type || "";
  } catch {
    lastState = false;
    currentType = "";
  }
  renderCurrentType();
  renderPlayerTypes();
}

async function renderStatus() {
  try {
    const data = await WsFillApi.storage.local.get([
      "remoteConfig",
      "configFetchedAt",
      "configFetchError",
      "configSource",
    ]);
    const err = data.configFetchError
      ? t("configStatusError", { err: data.configFetchError })
      : "";
    statusEl.textContent =
      t("configStatus", {
        v: data.remoteConfig?.version ?? "?",
        s: data.configSource || "bundled",
        t: formatTime(data.configFetchedAt),
      }) + err;
  } catch {
    statusEl.textContent = t("configUnavailable");
  }
}

async function bootPopup() {
  try {
    const result = await WsFillApi.storage.sync.get({
      enabled: true,
      configUrl: "",
      urlBlacklist: [],
      playerTypes: {},
      uiLang: "auto",
      ...WsFillConfig.FILL_DEFAULTS,
    });
    langPref = result.uiLang || "auto";
    locale = WsFillI18n.resolveLocale(langPref);
    enabledEl.checked = result.enabled !== false;
    fill = WsFillConfig.normalizeFill(result);
    urlEl.value = result.configUrl || "";
    playerTypes = WsFillConfig.normalizePlayerTypes(result.playerTypes);
    const normalized = WsFillConfig.normalizeBlacklist(result.urlBlacklist || []);
    urlBlacklist = normalized;
    const before = JSON.stringify(result.urlBlacklist || []);
    const after = JSON.stringify(normalized);
    if (before !== after) {
      await storageSet({ urlBlacklist: normalized });
    }
  } catch {
    /* ignore */
  }

  applyLanguage();
  await loadCurrentType();
}

/** Some pages only pick up a changed setting (or an updated extension) on reload. */
reloadTabBtn.addEventListener("click", async () => {
  reloadTabBtn.disabled = true;
  currentTypeEl.textContent = t("reloading");
  try {
    const tabs = await WsFillApi.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (tab?.id) {
      await WsFillApi.tabs.reload(tab.id);
      // Give the content script time to boot before asking it anything.
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
  } catch {
    /* tab gone or not reloadable */
  }
  lastState = null;
  await loadCurrentType();
  reloadTabBtn.disabled = false;
});

enabledEl.addEventListener("change", () => {
  storageSet({ enabled: enabledEl.checked });
});

for (const input of modeInputs) {
  input.addEventListener("change", () => {
    if (input.checked) saveFill({ fillMode: input.value });
  });
}

stretchLimitEl.addEventListener("change", () => {
  saveFill({ stretchLimit: Number(stretchLimitEl.value) });
});

overLimitEl.addEventListener("change", () => {
  saveFill({ overLimit: overLimitEl.value });
});

langEl.addEventListener("change", () => {
  langPref = langEl.value || "auto";
  storageSet({ uiLang: langPref });
  applyLanguage();
});

urlEl.addEventListener("change", () => {
  storageSet({ configUrl: urlEl.value.trim() });
});

blacklistAdd.addEventListener("click", addBlacklistEntry);
blacklistInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addBlacklistEntry();
  }
});

blacklistCurrent.addEventListener("click", startCurrentPageBlock);

chooseUrl.addEventListener("click", () => {
  if (!pendingTab) return;
  pushEntry(pendingTab.pageEntry);
  hideChoice();
});

chooseDomain.addEventListener("click", () => {
  if (!pendingTab) return;
  pushEntry(pendingTab.domainEntry);
  hideChoice();
});

chooseCancel.addEventListener("click", hideChoice);

refreshBtn.addEventListener("click", async () => {
  await storageSet({ configUrl: urlEl.value.trim() });
  refreshBtn.disabled = true;
  statusEl.textContent = t("checking");
  try {
    const result = await WsFillApi.runtime.sendMessage({ type: "refreshConfig" });
    if (result?.ok) {
      statusEl.textContent = t("checkOk", {
        s: result.source,
        v: result.version,
      });
    } else {
      statusEl.textContent = t("checkFailed", {
        err: result?.error || t("unknownError"),
      });
    }
  } catch (err) {
    statusEl.textContent = err?.message || t("swUnreachable");
  }
  refreshBtn.disabled = false;
  await renderStatus();
});

WsFillApi.storage.onChanged.addListener((changes, area) => {
  if (area === "local") renderStatus();
  if (area !== "sync") return;
  if (changes.uiLang) {
    langPref = changes.uiLang.newValue || "auto";
    applyLanguage();
  }
  if (FILL_KEYS.some((key) => changes[key])) {
    const next = { ...fill };
    for (const key of FILL_KEYS) {
      if (changes[key]) next[key] = changes[key].newValue;
    }
    fill = WsFillConfig.normalizeFill(next);
    renderFill();
  }
  if (changes.playerTypes) {
    playerTypes = WsFillConfig.normalizePlayerTypes(changes.playerTypes.newValue);
    renderPlayerTypes();
  }
  if (changes.urlBlacklist) {
    urlBlacklist = WsFillConfig.normalizeBlacklist(
      changes.urlBlacklist.newValue || []
    );
    renderBlacklist();
  }
});

bootPopup();
