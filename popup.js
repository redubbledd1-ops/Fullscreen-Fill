const enabledEl = document.getElementById("enabled");
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
const typesSummary = document.getElementById("typesSummary");
const currentTypeEl = document.getElementById("currentType");

let urlBlacklist = [];
let pendingTab = null;
let playerTypes = WsFillConfig.defaultPlayerTypes();
let currentType = "";

function formatTime(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "—";
  }
}

async function storageSet(values) {
  try {
    await chrome.storage.sync.set(values);
  } catch {
    /* ignore quota / context errors */
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

function renderBlacklist() {
  blacklistList.replaceChildren();
  const count = urlBlacklist.length;
  blacklistSummary.textContent =
    count > 0 ? `URL blacklist (${count})` : "URL blacklist";

  urlBlacklist.forEach((entry, index) => {
    const li = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = WsFillConfig.displayBlacklistEntry(entry);
    label.title = entry;
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "Verwijder";
    removeBtn.addEventListener("click", () => {
      urlBlacklist.splice(index, 1);
      saveBlacklist();
      renderBlacklist();
    });
    li.append(label, removeBtn);
    blacklistList.appendChild(li);
  });
}

function renderPlayerTypes() {
  typeList.replaceChildren();
  const off = WsFillConfig.PLAYER_TYPES.filter((t) => playerTypes[t] === false);
  typesSummary.textContent = off.length
    ? `Spelertypes (${off.length} uit)`
    : "Spelertypes";

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
    text.textContent = WsFillConfig.playerTypeLabel(type);
    label.append(box, text);

    if (type === currentType) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "deze tab";
      label.appendChild(badge);
    }

    typeList.appendChild(label);
  }
}

function describeState(state) {
  if (!state?.type) return "Huidige tab: geen speler gevonden";
  const label = state.typeLabel || state.type;
  let why = "breedbeeld actief";
  if (!state.enabled) why = "extensie uit";
  else if (state.blacklisted) why = "geblacklist";
  else if (!state.typeAllowed) why = "dit spelertype staat uit";
  else if (!state.active && state.fullscreenOnly && !state.fullscreen) {
    why = "alleen in fullscreen";
  } else if (!state.active) why = "nu niet actief";
  return `Huidige tab: ${label} · ${why}`;
}

async function loadCurrentType() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (!tab?.id) throw new Error("geen tab");
    const state = await chrome.tabs.sendMessage(tab.id, {
      type: "wsFillState",
    });
    currentType = state?.type || "";
    currentTypeEl.textContent = describeState(state);
  } catch {
    currentType = "";
    currentTypeEl.textContent =
      "Huidige tab: onbekend (pagina herladen na update)";
  }
  renderPlayerTypes();
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
  intro.textContent = "Wat wil je blokkeren?";
  const urlLine = document.createElement("div");
  urlLine.textContent = `Alleen deze URL: ${previewUrl}`;
  const domainLine = document.createElement("div");
  domainLine.textContent = `Heel domain: ${domainEntry.replace(/^domain:/, "")}`;
  currentChoiceText.append(intro, urlLine, domainLine);
  currentChoice.hidden = false;
  currentChoice.classList.add("visible");
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
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (!tab?.url) {
      currentChoiceText.textContent = "Geen actieve tab-URL gevonden.";
      currentChoice.hidden = false;
      currentChoice.classList.add("visible");
      return;
    }
    const parsed = parseTabUrl(tab.url);
    if (!parsed) {
      currentChoiceText.textContent =
        "Deze pagina kan niet geblacklist (chrome:// of interne pagina).";
      currentChoice.hidden = false;
      currentChoice.classList.add("visible");
      chooseUrl.disabled = true;
      chooseDomain.disabled = true;
      return;
    }
    showChoice(parsed.pageEntry, parsed.domainEntry, parsed.previewUrl);
  } catch (err) {
    currentChoiceText.textContent = `Kon tab niet lezen: ${err.message || err}`;
    currentChoice.hidden = false;
    currentChoice.classList.add("visible");
  }
}

async function renderStatus() {
  try {
    const data = await chrome.storage.local.get([
      "remoteConfig",
      "configFetchedAt",
      "configFetchError",
      "configSource",
    ]);
    const version = data.remoteConfig?.version ?? "?";
    const source = data.configSource || "bundled";
    const when = formatTime(data.configFetchedAt);
    const err = data.configFetchError ? ` · fout: ${data.configFetchError}` : "";
    statusEl.textContent = `Config v${version} · bron: ${source} · ${when}${err}`;
  } catch {
    statusEl.textContent = "Config status niet beschikbaar.";
  }
}

async function bootPopup() {
  try {
    const result = await chrome.storage.sync.get({
      enabled: true,
      configUrl: "",
      urlBlacklist: [],
      playerTypes: {},
    });
    playerTypes = WsFillConfig.normalizePlayerTypes(result.playerTypes);
    renderPlayerTypes();
    enabledEl.checked = result.enabled !== false;
    urlEl.value = result.configUrl || "";
    const normalized = WsFillConfig.normalizeBlacklist(result.urlBlacklist || []);
    urlBlacklist = normalized;
    renderBlacklist();
    const before = JSON.stringify(result.urlBlacklist || []);
    const after = JSON.stringify(normalized);
    if (before !== after) {
      await storageSet({ urlBlacklist: normalized });
    }
  } catch {
    /* ignore */
  }
  await renderStatus();
  await loadCurrentType();
}

enabledEl.addEventListener("change", () => {
  storageSet({ enabled: enabledEl.checked });
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
  statusEl.textContent = "Controleren…";
  try {
    const result = await chrome.runtime.sendMessage({ type: "refreshConfig" });
    if (result?.ok) {
      statusEl.textContent = `OK · bron: ${result.source} · v${result.version}`;
    } else {
      statusEl.textContent = `Mislukt: ${result?.error || "onbekend"} (fallback actief)`;
    }
  } catch (err) {
    statusEl.textContent = err?.message || "Service worker niet bereikbaar";
  }
  refreshBtn.disabled = false;
  await renderStatus();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local") renderStatus();
  if (area === "sync" && changes.playerTypes) {
    playerTypes = WsFillConfig.normalizePlayerTypes(
      changes.playerTypes.newValue
    );
    renderPlayerTypes();
  }
  if (area === "sync" && changes.urlBlacklist) {
    urlBlacklist = WsFillConfig.normalizeBlacklist(
      changes.urlBlacklist.newValue || []
    );
    renderBlacklist();
  }
});

bootPopup();
