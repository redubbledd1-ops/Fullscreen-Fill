/** Shared config loader + helpers for content scripts. */
const WsFillConfig = (() => {
  const STYLE_ID = "ws-fill-remote-style";
  const OVERRIDE_STYLE_ID = "ws-fill-override-style";

  function isValid(config) {
    if (!config || typeof config !== "object") return false;
    if (typeof config.version !== "number") return false;
    // Legacy YouTube block
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

  async function loadDefaults() {
    const res = await fetch(WsFillApi.runtime.getURL("config/defaults.json"));
    return res.json();
  }

  /** Fold legacy `youtube` block into overrides when missing. */
  function normalizeConfig(config) {
    if (!config || typeof config !== "object") return config;
    const overrides = Array.isArray(config.overrides)
      ? config.overrides.map((o) => ({ ...o }))
      : [];

    if (
      config.youtube &&
      typeof config.youtube.css === "string" &&
      config.youtube.css.length > 20 &&
      !overrides.some((o) => o && o.id === "youtube")
    ) {
      overrides.unshift({
        id: "youtube",
        match: [
          "youtube.com",
          "youtu.be",
          "m.youtube.com",
          "music.youtube.com",
        ],
        css: config.youtube.css,
        activeClass: config.youtube.bodyClass || "yt-fill-active",
        fullscreenOnly: true,
        fullscreenHint: {
          selector: config.youtube.playerSelector || ".html5-video-player",
          class: config.youtube.fullscreenClass || "ytp-fullscreen",
        },
        events: ["yt-navigate-finish", "yt-page-data-updated"],
      });
    }

    return { ...config, overrides };
  }

  async function get() {
    const stored = await WsFillApi.storage.local.get(["remoteConfig"]);
    if (isValid(stored.remoteConfig)) {
      let cfg = stored.remoteConfig;
      if (!Array.isArray(cfg.overrides)) {
        const defaults = await loadDefaults();
        cfg = {
          ...cfg,
          overrides: defaults.overrides || [],
          generic: { ...(defaults.generic || {}), ...(cfg.generic || {}) },
        };
      }
      return normalizeConfig(cfg);
    }
    return normalizeConfig(await loadDefaults());
  }

  function injectYoutubeCss(css) {
    let el = document.getElementById(STYLE_ID);
    if (!el) {
      el = document.createElement("style");
      el.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(el);
    }
    el.textContent = css;
  }

  function stripWww(host) {
    return String(host || "")
      .toLowerCase()
      .replace(/^www\./, "");
  }

  /**
   * Override match:
   * - string or string[] of host / host/path / re:pattern
   */
  function overrideMatches(match, href = location.href) {
    if (Array.isArray(match)) {
      return match.some((m) => overrideMatches(m, href));
    }

    const raw = String(match || "").trim();
    if (!raw) return false;

    let host = "";
    let path = "";
    try {
      const u = new URL(href);
      host = stripWww(u.hostname);
      path = u.pathname || "/";
    } catch {
      return false;
    }

    if (/^re:/i.test(raw)) {
      try {
        return new RegExp(raw.slice(3), "i").test(`${host}${path} ${href}`);
      } catch {
        return false;
      }
    }

    let pattern = raw.replace(/^host:/i, "");
    pattern = pattern.replace(/^https?:\/\//i, "");
    pattern = pattern.replace(/^www\./i, "");

    if (pattern.includes("/")) {
      const slash = pattern.indexOf("/");
      const h = stripWww(pattern.slice(0, slash));
      const p = pattern.slice(slash) || "/";
      const hostOk = host === h || host.endsWith("." + h);
      const prefix = p.endsWith("/") ? p.slice(0, -1) : p;
      return (
        hostOk &&
        (path === prefix || path.startsWith(prefix + "/") || path.startsWith(p))
      );
    }

    const h = stripWww(pattern);
    return host === h || host.endsWith("." + h);
  }

  function matchingOverrides(config, href = location.href) {
    const list = config?.overrides;
    if (!Array.isArray(list) || !list.length) return [];
    return list.filter((o) => o && overrideMatches(o.match, href));
  }

  function matchingOverrideCss(config, href = location.href) {
    return matchingOverrides(config, href)
      .filter((o) => typeof o.css === "string" && o.css.length > 5)
      .map((o) => o.css)
      .join("\n");
  }

  function injectOverrideCss(css) {
    let el = document.getElementById(OVERRIDE_STYLE_ID);
    if (!css) {
      el?.remove();
      return;
    }
    if (!el) {
      el = document.createElement("style");
      el.id = OVERRIDE_STYLE_ID;
      (document.head || document.documentElement).appendChild(el);
    }
    el.textContent = css;
  }

  function applySiteOverrides(config, href = location.href) {
    injectOverrideCss(matchingOverrideCss(config, href));
  }

  /**
   * Player types the user can switch off separately from the URL blacklist.
   * One type per video, decided in this order: drm > embed > mse > native.
   */
  const PLAYER_TYPES = ["native", "mse", "drm", "embed"];

  const PLAYER_TYPE_LABELS = {
    native: "Native (mp4 / directe bron)",
    mse: "MSE (YouTube, meeste streaming)",
    drm: "DRM (Netflix, Prime, beveiligd)",
    embed: "Iframe-embed (speler in frame)",
  };

  function defaultPlayerTypes() {
    const out = {};
    for (const type of PLAYER_TYPES) out[type] = true;
    return out;
  }

  /** Unknown keys are dropped; anything not explicitly false stays on. */
  function normalizePlayerTypes(raw) {
    const out = defaultPlayerTypes();
    if (!raw || typeof raw !== "object") return out;
    for (const type of PLAYER_TYPES) {
      if (raw[type] === false) out[type] = false;
    }
    return out;
  }

  function isPlayerTypeEnabled(types, type) {
    if (!type) return true;
    return normalizePlayerTypes(types)[type] !== false;
  }

  function playerTypeLabel(type) {
    return PLAYER_TYPE_LABELS[type] || type || "onbekend";
  }

  function hasMediaKeys(video) {
    try {
      return Boolean(video && video.mediaKeys);
    } catch {
      return false;
    }
  }

  /**
   * detectPlayerType(video, { inIframe, drmSeen })
   * drmSeen = an "encrypted" event was observed on this element.
   * A source we cannot classify counts as native.
   */
  function detectPlayerType(video, options = {}) {
    if (options.drmSeen || hasMediaKeys(video)) return "drm";
    if (options.inIframe) return "embed";
    let src = "";
    try {
      src = video?.currentSrc || video?.src || "";
      if (!src && video?.srcObject) return "mse";
    } catch {
      src = "";
    }
    if (/^blob:/i.test(src)) return "mse";
    return "native";
  }

  /** true = portrait (taller than wide). null = dimensions unknown yet. */
  function portraitState(video) {
    if (!video) return null;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return null;
    return h > w;
  }

  function isPortraitVideo(video) {
    return portraitState(video) === true;
  }

  function clearVideoStretch(el) {
    if (!el) return;
    [
      "width",
      "height",
      "min-width",
      "min-height",
      "object-fit",
      "object-position",
      "max-width",
      "max-height",
      "transform",
      "transform-origin",
      "left",
      "top",
      "right",
      "bottom",
      "position",
      "inset",
      "z-index",
      "margin",
      "aspect-ratio",
      "padding",
      "padding-top",
      "padding-bottom",
      "padding-left",
      "padding-right",
      "flex",
      "display",
    ].forEach((prop) => el.style.removeProperty(prop));
  }

  function hostMatches(pattern) {
    if (!pattern) return false;
    try {
      return new RegExp(pattern, "i").test(location.hostname + location.href);
    } catch {
      return false;
    }
  }

  function isYouTubeHost(host) {
    const h = stripWww(host);
    return (
      h === "youtube.com" ||
      h === "m.youtube.com" ||
      h === "youtu.be" ||
      h === "music.youtube.com"
    );
  }

  function youtubeVideoIdFromUrl(urlLike) {
    try {
      const urlObj =
        typeof urlLike === "string" ? new URL(urlLike) : urlLike;
      if (!urlObj) return "";
      const host = stripWww(urlObj.hostname);
      if (host === "youtu.be") {
        return urlObj.pathname.replace(/^\//, "").split("/")[0] || "";
      }
      if (isYouTubeHost(host)) {
        const v = urlObj.searchParams.get("v");
        if (v) return v;
        const parts = urlObj.pathname.split("/").filter(Boolean);
        if (
          parts.length >= 2 &&
          (parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "live")
        ) {
          return parts[1] || "";
        }
      }
    } catch {
      /* ignore */
    }
    return "";
  }

  /** Convert legacy entries to typed forms where possible. */
  function normalizeBlacklistEntry(raw) {
    const entry = String(raw || "").trim();
    if (!entry) return "";

    if (/^(ytid|domain|page):/i.test(entry)) {
      const kind = entry.slice(0, entry.indexOf(":")).toLowerCase();
      const value = entry.slice(entry.indexOf(":") + 1).trim();
      if (!value) return "";
      if (kind === "ytid") return `ytid:${value}`;
      if (kind === "domain") return `domain:${stripWww(value)}`;
      return `page:${value}`;
    }

    if (/^https?:\/\//i.test(entry)) {
      try {
        const u = new URL(entry);
        const id = youtubeVideoIdFromUrl(u);
        if (id) return `ytid:${id}`;
        u.hash = "";
        return `page:${u.origin}${u.pathname}${u.search}`;
      } catch {
        return `page:${entry}`;
      }
    }

    // Bare domain (no slash) → whole site
    if (!entry.includes("/")) {
      return `domain:${stripWww(entry)}`;
    }

    // Path without protocol
    try {
      const u = new URL("https://" + entry.replace(/^\/\//, ""));
      const id = youtubeVideoIdFromUrl(u);
      if (id) return `ytid:${id}`;
      return `page:https://${entry.replace(/^\/\//, "")}`;
    } catch {
      return `page:${entry}`;
    }
  }

  function normalizeBlacklist(list) {
    if (!Array.isArray(list)) return [];
    const out = [];
    const seen = new Set();
    for (const raw of list) {
      const n = normalizeBlacklistEntry(raw);
      if (!n) continue;
      const key = n.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(n);
    }
    return out;
  }

  /**
   * Typed blacklist:
   * - ytid:VIDEO_ID → only that YouTube video
   * - page:https://... → exact page (origin+path+search)
   * - domain:example.com → whole domain
   */
  function isUrlBlacklisted(list, href = location.href) {
    const items = normalizeBlacklist(list);
    if (!items.length) return false;

    let current;
    try {
      current = new URL(href);
    } catch {
      return false;
    }

    const curHost = stripWww(current.hostname);
    const curId = youtubeVideoIdFromUrl(current);
    const curPage = `${current.origin}${current.pathname}${current.search}`;

    return items.some((entry) => {
      const lower = entry.toLowerCase();
      if (lower.startsWith("ytid:")) {
        const id = entry.slice(5).trim();
        return Boolean(id && curId && id === curId);
      }
      if (lower.startsWith("domain:")) {
        const domain = stripWww(entry.slice(7));
        return curHost === domain || curHost.endsWith("." + domain);
      }
      if (lower.startsWith("page:")) {
        const page = entry.slice(5).trim();
        try {
          const blocked = new URL(page);
          const blockedId = youtubeVideoIdFromUrl(blocked);
          if (blockedId && curId) return blockedId === curId;
          const blockedPage = `${blocked.origin}${blocked.pathname}${blocked.search}`;
          return curPage.toLowerCase() === blockedPage.toLowerCase();
        } catch {
          return curPage.toLowerCase() === page.toLowerCase();
        }
      }
      return false;
    });
  }

  function displayBlacklistEntry(entry) {
    const n = normalizeBlacklistEntry(entry);
    if (n.startsWith("ytid:")) return `YouTube video (${n.slice(5)})`;
    if (n.startsWith("domain:")) return `Domain: ${n.slice(7)}`;
    if (n.startsWith("page:")) return n.slice(5);
    return n;
  }

  /*
   * How a filled video meets its box — one model, three storage.sync keys,
   * shared by the popup and the engine:
   *
   *   fillMode      "stretch" distorts the picture to the box; "zoom" enlarges
   *                 it until the box is covered and crops what spills over.
   *   stretchLimit  stretch mode only: the most distortion allowed, in percent;
   *                 0 means no limit, which is plain stretch.
   *   overLimit     what a picture past that limit gets instead: "zoom", or
   *                 "bars" — left letterboxed as the site had it.
   *
   * The defaults are FILL_DEFAULTS, so any of them can move without touching
   * anything else.
   */
  const FILL_MODES = ["stretch", "zoom"];
  const STRETCH_LIMITS = [0, 5, 10, 15, 20, 25, 33, 50];
  const OVER_LIMITS = ["zoom", "bars"];

  const FILL_DEFAULTS = {
    fillMode: "zoom",
    stretchLimit: 0,
    overLimit: "zoom",
  };

  /** Pass a storage.sync result (or any object with those keys). */
  function normalizeFill(raw) {
    const limit = Number(raw?.stretchLimit);
    return {
      fillMode: FILL_MODES.includes(raw?.fillMode)
        ? raw.fillMode
        : FILL_DEFAULTS.fillMode,
      stretchLimit: STRETCH_LIMITS.includes(limit)
        ? limit
        : FILL_DEFAULTS.stretchLimit,
      overLimit: OVER_LIMITS.includes(raw?.overLimit)
        ? raw.overLimit
        : FILL_DEFAULTS.overLimit,
    };
  }

  /**
   * How far a picture must be distorted to fill a box exactly: 0.33 means one
   * axis is stretched a third more than the other. A 4:3 clip on a 16:9 screen
   * is 0.33, a 21:9 film on 16:9 is 0.31, 16:9 on a 20:9 phone is 0.25 and on
   * a 16:10 laptop 0.11.
   */
  function aspectDifference(pictureRatio, boxRatio) {
    if (!(pictureRatio > 0) || !(boxRatio > 0)) return 0;
    return Math.max(pictureRatio, boxRatio) / Math.min(pictureRatio, boxRatio) - 1;
  }

  /**
   * The object-fit for one video: "fill" (stretch), "cover" (zoom) or
   * "contain" (bars). Whole percents, so a 33% limit admits 4:3 on 16:9.
   */
  function chooseFit(fill, pictureRatio, boxRatio) {
    if (fill.fillMode === "zoom") return "cover";
    if (!fill.stretchLimit) return "fill";
    const percent = Math.round(aspectDifference(pictureRatio, boxRatio) * 100);
    if (percent <= fill.stretchLimit) return "fill";
    return fill.overLimit === "bars" ? "contain" : "cover";
  }

  return {
    isValid,
    loadDefaults,
    get,
    normalizeConfig,
    injectYoutubeCss,
    STYLE_ID,
    OVERRIDE_STYLE_ID,
    overrideMatches,
    matchingOverrides,
    matchingOverrideCss,
    injectOverrideCss,
    applySiteOverrides,
    portraitState,
    isPortraitVideo,
    clearVideoStretch,
    hostMatches,
    isUrlBlacklisted,
    youtubeVideoIdFromUrl,
    normalizeBlacklistEntry,
    normalizeBlacklist,
    displayBlacklistEntry,
    isYouTubeHost,
    stripWww,
    PLAYER_TYPES,
    PLAYER_TYPE_LABELS,
    defaultPlayerTypes,
    normalizePlayerTypes,
    isPlayerTypeEnabled,
    playerTypeLabel,
    detectPlayerType,
    FILL_MODES,
    STRETCH_LIMITS,
    OVER_LIMITS,
    FILL_DEFAULTS,
    normalizeFill,
    aspectDifference,
    chooseFit,
  };
})();
