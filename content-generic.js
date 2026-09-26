(() => {
  // Restricted / dead frames: bail before any extension API calls.
  try {
    if (!WsFillApi?.runtime?.id || !WsFillApi?.storage?.sync) return;
  } catch {
    return;
  }

  /*
   * The fill itself lives in content-generic.css, not here.
   *
   * This script never measures the page and never writes a style. Measuring an
   * element we had just restyled meant every decision read back our own work,
   * which is a feedback loop: the player jumped between two layouts, and the
   * getComputedStyle walk that fed the loop forced a reflow per ancestor per
   * pass. Both problems disappear if the stylesheet states the outcome and the
   * script only says which videos it applies to.
   *
   * So all this does is set flags:
   *   html/body .ws-fill-active    extension on, site not blacklisted
   *   html/body .ws-fill-fsonly    this site may only fill in fullscreen
   *   html/body .ws-fill-portrait  the biggest video is portrait
   *   html/body .ws-fill-embed     we are inside a player iframe
   *   <video data-ws-fill>         a video big enough to be the real player
   *   <video data-ws-portrait>     a video that must not be stretched
   *
   * Sizes come from a ResizeObserver, which hands us the box it already
   * computed, so reading one costs no layout. Fullscreen is not tracked at all:
   * CSS has :fullscreen and the browser knows better than we do.
   *
   * Players that letterbox by sizing the <video> element itself, rather than by
   * drawing bars inside it, cannot be fixed generically without guessing at the
   * page structure — that guessing is what used to break. They get a css entry
   * in the remote config instead, which ships without a store review.
   */

  const ROOT = "ws-fill-active";
  const PORTRAIT = "ws-fill-portrait";
  const FSONLY = "ws-fill-fsonly";
  const EMBED = "ws-fill-embed";
  const MARK = "data-ws-fill";
  const MARK_PORTRAIT = "data-ws-portrait";
  const STORAGE_KEY = "enabled";

  let enabled = true;
  let urlBlacklist = [];
  let playerTypes = WsFillConfig.defaultPlayerTypes();
  let remoteCfg = null;

  const inIframe = window !== window.top;

  const drmVideos = new WeakSet();
  const trackedVideos = new WeakSet();

  let generic = {
    mainVideoMinAreaRatio: 0.32,
    mainVideoMinWidthRatio: 0.5,
    mainVideoMinHeightRatio: 0.32,
    mainVideoMinWidth: 280,
    mainVideoMinHeight: 160,
    embedMinWidth: 480,
    embedMinHeight: 270,
    embedVideoMinAreaRatio: 0.45,
    iframeMinAreaRatio: 0.18,
    mobileMaxViewportWidth: 820,
    mobile: {
      mainVideoMinAreaRatio: 0.14,
      mainVideoMinWidthRatio: 0.7,
      mainVideoMinHeightRatio: 0.1,
      mainVideoMinWidth: 240,
      mainVideoMinHeight: 120,
      embedMinWidth: 280,
      embedMinHeight: 140,
      embedVideoMinAreaRatio: 0.25,
      iframeMinAreaRatio: 0.08,
    },
  };

  /**
   * Thresholds in use right now. On a phone in portrait a 16:9 player across
   * the full width covers only ~0.26 of the viewport, well under the desktop
   * minimum, so the mobile block replaces those numbers.
   */
  let tuning = generic;

  function isMobileViewport() {
    try {
      if (window.matchMedia?.("(pointer: coarse)")?.matches) return true;
    } catch {
      /* no matchMedia */
    }
    const width = window.innerWidth || 0;
    return width > 0 && width <= (generic.mobileMaxViewportWidth ?? 820);
  }

  function refreshTuning() {
    const mobile = generic.mobile;
    tuning =
      mobile && typeof mobile === "object" && isMobileViewport()
        ? { ...generic, ...mobile }
        : generic;
  }

  function mergeGeneric(next) {
    if (!next) return;
    generic = {
      ...generic,
      ...next,
      mobile: { ...generic.mobile, ...(next.mobile || {}) },
    };
    refreshTuning();
  }

  // ---------------------------------------------------------------- site info

  function pageOverrides() {
    return WsFillConfig.matchingOverrides(remoteCfg || {});
  }

  function isFullscreenOnlySite() {
    return pageOverrides().some((o) => o.fullscreenOnly);
  }

  function isBlacklistedNow() {
    return WsFillConfig.isUrlBlacklisted(urlBlacklist, location.href);
  }

  function isFullscreen() {
    return Boolean(
      document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
    );
  }

  /**
   * Some players have a full-window mode the Fullscreen API knows nothing
   * about. A config entry names the element and the class it carries there.
   */
  function hintedFullscreenPlayer() {
    for (const o of pageOverrides()) {
      const hint = o.fullscreenHint;
      if (!hint?.selector || !hint?.class) continue;
      try {
        const player = document.querySelector(hint.selector);
        if (player?.classList.contains(hint.class)) return player;
      } catch {
        /* bad selector */
      }
    }
    return null;
  }

  function isHintedFullscreen() {
    return Boolean(hintedFullscreenPlayer());
  }

  // ------------------------------------------------------------- player types

  /** Watch for EME so a protected player is recognised as drm, not mse. */
  function trackVideo(video) {
    if (!video || trackedVideos.has(video)) return;
    trackedVideos.add(video);
    video.addEventListener(
      "encrypted",
      () => {
        drmVideos.add(video);
        typeCache.delete(video);
        syncVideo(video);
      },
      { once: true }
    );
  }

  const typeCache = new WeakMap();

  function videoType(video) {
    if (!video) return "";
    trackVideo(video);
    const cached = typeCache.get(video);
    if (cached !== undefined) return cached;
    const type = WsFillConfig.detectPlayerType(video, {
      inIframe,
      drmSeen: drmVideos.has(video),
    });
    typeCache.set(video, type);
    return type;
  }

  function typeAllowed(video) {
    return WsFillConfig.isPlayerTypeEnabled(playerTypes, videoType(video));
  }

  // ------------------------------------------------------------- orientation

  /**
   * Last orientation we actually measured, per video.
   *
   * videoWidth/videoHeight drop to 0 while a stream seeks or switches
   * representation, so portraitState reports "unknown" for a few frames in the
   * middle of playback. Taken at face value that flips the fill off and back on
   * — the screen jumps every time you scrub. A clip does not turn sideways
   * mid-playback, so keep the last real answer.
   */
  const lastOrientation = new WeakMap();

  function orientationOf(video) {
    if (!video) return null;
    const state = WsFillConfig.portraitState(video);
    if (state !== null) {
      lastOrientation.set(video, state);
      return state;
    }
    const known = lastOrientation.get(video);
    return known === undefined ? null : known;
  }

  // ------------------------------------------------------------------- sizing

  /**
   * Boxes as the ResizeObserver last reported them. Reading one back is free;
   * calling getBoundingClientRect on every pass, as this script used to, is
   * what forced a reflow each time.
   */
  const videoBoxes = new WeakMap();

  /**
   * A ResizeObserver delivers on an animation frame, so a tab that has not been
   * visited yet holds no boxes — and a browser without one never would. Measure
   * such a video once here instead of treating it as zero-sized; the observer
   * takes over from its first delivery.
   */
  function boxOf(video) {
    const known = videoBoxes.get(video);
    if (known) return known;
    const box = { w: video.clientWidth, h: video.clientHeight };
    if (box.w > 0 && box.h > 0) videoBoxes.set(video, box);
    return box;
  }

  function isPlayerSized(w, h) {
    const vw = window.innerWidth || 1;
    const vh = window.innerHeight || 1;

    if (inIframe) {
      // An embed frame is cropped to the player, so the same ratios would
      // reject nothing. Judge it against the frame it was given instead.
      if (vw < (tuning.embedMinWidth ?? 480) * 0.5) return false;
      if (vh < (tuning.embedMinHeight ?? 270) * 0.5) return false;
      return (w * h) / (vw * vh) >= (tuning.embedVideoMinAreaRatio ?? 0.45);
    }

    if (w < (tuning.mainVideoMinWidth ?? 280)) return false;
    if (h < (tuning.mainVideoMinHeight ?? 160)) return false;
    const areaRatio = (w * h) / (vw * vh);
    return (
      areaRatio >= (tuning.mainVideoMinAreaRatio ?? 0.32) ||
      (w / vw >= (tuning.mainVideoMinWidthRatio ?? 0.5) &&
        h / vh >= (tuning.mainVideoMinHeightRatio ?? 0.32))
    );
  }

  // --------------------------------------------------------------- the flags

  let siteAllowed = true;

  function refreshSiteAllowed() {
    siteAllowed = enabled && !isBlacklistedNow();
  }

  /**
   * In fullscreen a marked video is sized by our own stylesheet, so the box the
   * observer reports is our work, not the player's. Judging that box again is
   * the feedback loop described at the top of this file: whatever size our css
   * produces decides whether our css applies. A video that was the player when
   * fullscreen began stays the player until it ends; on the way out the
   * stylesheet lets go, the box changes, and the observer judges it afresh.
   */
  function heldByFullscreen(video) {
    if (!video.hasAttribute(MARK)) return false;
    const shell = document.fullscreenElement || document.webkitFullscreenElement;
    return Boolean(shell && shell !== video && shell.contains(video));
  }

  /**
   * Decide the two attributes for one video. No layout is read: the size comes
   * from the observer and the orientation from the decoded stream.
   */
  function syncVideo(video) {
    if (!video?.isConnected) return;

    const orientation = orientationOf(video);
    if (orientation === true) video.setAttribute(MARK_PORTRAIT, "1");
    else if (orientation === false) video.removeAttribute(MARK_PORTRAIT);

    const { w, h } = boxOf(video);
    const fill =
      siteAllowed &&
      orientation !== null &&
      (heldByFullscreen(video) || isPlayerSized(w, h)) &&
      typeAllowed(video);

    if (fill) video.setAttribute(MARK, "1");
    else video.removeAttribute(MARK);
  }

  /** The biggest video we know of, by the size the observer last reported. */
  function primaryVideo() {
    let best = null;
    let bestArea = 0;
    for (const video of document.querySelectorAll("video")) {
      const { w, h } = boxOf(video);
      const area = w * h;
      if (area > bestArea) {
        bestArea = area;
        best = video;
      }
    }
    return best;
  }

  function syncRootFlags() {
    const root = document.documentElement;
    const body = document.body;
    const active = siteAllowed;
    const portrait = orientationOf(primaryVideo()) === true;

    root.classList.toggle(ROOT, active);
    body?.classList.toggle(ROOT, active);
    root.classList.toggle(PORTRAIT, portrait);
    body?.classList.toggle(PORTRAIT, portrait);
    root.classList.toggle(FSONLY, isFullscreenOnlySite());
    body?.classList.toggle(FSONLY, isFullscreenOnlySite());
    root.classList.toggle(EMBED, inIframe && active);
    body?.classList.toggle(EMBED, inIframe && active);

    toggleOverrideActiveClasses(active && !portrait);
  }

  /** Per-site css from the config is gated by its own class. */
  function toggleOverrideActiveClasses(on) {
    const fsOk = isFullscreen() || isHintedFullscreen();
    const matched = pageOverrides();
    const matchedIds = new Set(matched.map((o) => o.activeClass).filter(Boolean));

    for (const o of matched) {
      if (!o.activeClass) continue;
      const use = on && (o.fullscreenOnly ? fsOk : true);
      document.body?.classList.toggle(o.activeClass, use);
      document.documentElement.classList.toggle(o.activeClass, use);
    }

    for (const o of remoteCfg?.overrides || []) {
      if (!o?.activeClass || matchedIds.has(o.activeClass)) continue;
      if (!WsFillConfig.overrideMatches(o.match)) {
        document.body?.classList.remove(o.activeClass);
        document.documentElement.classList.remove(o.activeClass);
      }
    }
  }

  function syncAll() {
    refreshTuning();
    refreshSiteAllowed();
    document.querySelectorAll("video").forEach(observeVideo);
    document.querySelectorAll("video").forEach(syncVideo);
    syncRootFlags();
  }

  let syncTimer = 0;

  function scheduleSync() {
    if (syncTimer) return;
    syncTimer = window.setTimeout(() => {
      syncTimer = 0;
      syncAll();
    }, 50);
  }

  // ---------------------------------------------------------------- observers

  /**
   * One observer for every video. It reports a box whenever the player resizes
   * one, which is exactly when the fill decision can change, and it reports the
   * current box the moment we start observing — so nothing has to be measured
   * up front either.
   */
  const sizeObserver =
    typeof ResizeObserver === "function"
      ? new ResizeObserver((entries) => {
          for (const entry of entries) {
            const r = entry.contentRect;
            videoBoxes.set(entry.target, { w: r.width, h: r.height });
            syncVideo(entry.target);
          }
          syncRootFlags();
        })
      : null;

  const observedVideos = new WeakSet();

  function observeVideo(video) {
    if (!video || observedVideos.has(video)) return;
    observedVideos.add(video);

    if (orientationOf(video) === null) {
      video.addEventListener(
        "loadedmetadata",
        () => {
          syncVideo(video);
          syncRootFlags();
        },
        { once: true }
      );
    }

    if (sizeObserver) {
      try {
        sizeObserver.observe(video);
        return;
      } catch {
        /* detached */
      }
    }
    // No ResizeObserver: fall back to the size at discovery time.
    videoBoxes.set(video, {
      w: video.clientWidth,
      h: video.clientHeight,
    });
    syncVideo(video);
  }

  function collectVideos(node, out) {
    if (!node || node.nodeType !== 1) return;
    if (node.tagName === "VIDEO") out.push(node);
    else if (node.querySelectorAll) {
      node.querySelectorAll("video").forEach((v) => out.push(v));
    }
  }

  /**
   * Only added nodes are inspected, and only for <video>. The old script
   * re-ran its whole pass on any mutation anywhere, which on a playing page
   * meant several full DOM walks a second.
   */
  const treeObserver = new MutationObserver((records) => {
    const found = [];
    for (const record of records) {
      record.addedNodes.forEach((node) => collectVideos(node, found));
    }
    if (!found.length) return;
    for (const video of found) {
      observeVideo(video);
      syncVideo(video);
    }
    syncRootFlags();
  });

  treeObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  // ------------------------------------------------------------------- events

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) scheduleSync();
  });

  // CSS handles the fill in fullscreen. This is only here for the per-site
  // activeClass and for what the popup reports.
  function onFullscreenChange() {
    syncRootFlags();
  }

  document.addEventListener("fullscreenchange", onFullscreenChange);
  document.addEventListener("webkitfullscreenchange", onFullscreenChange);

  window.addEventListener("resize", scheduleSync);
  window.addEventListener("popstate", scheduleSync);

  const hintObserver = new MutationObserver(() => syncRootFlags());
  const watchedHintPlayers = new WeakSet();

  function watchHintedPlayers() {
    for (const o of remoteCfg?.overrides || []) {
      const hint = o?.fullscreenHint;
      if (!hint?.selector) continue;
      let player;
      try {
        player = document.querySelector(hint.selector);
      } catch {
        continue;
      }
      if (!player || watchedHintPlayers.has(player)) continue;
      watchedHintPlayers.add(player);
      hintObserver.observe(player, {
        attributes: true,
        attributeFilter: ["class"],
      });
    }
  }

  function bindOverrideEvents() {
    if (!bindOverrideEvents._seen) bindOverrideEvents._seen = new Set();
    const seen = bindOverrideEvents._seen;
    for (const o of remoteCfg?.overrides || []) {
      for (const name of o.events || []) {
        if (!name || seen.has(name)) continue;
        seen.add(name);
        document.addEventListener(name, () => {
          watchHintedPlayers();
          scheduleSync();
        });
      }
    }
  }

  // A single-page app can swap the URL without any event we listen for, and
  // the blacklist is per URL. One check a second costs nothing.
  let lastUrl = location.href;
  setInterval(() => {
    if (document.hidden || location.href === lastUrl) return;
    lastUrl = location.href;
    watchHintedPlayers();
    scheduleSync();
  }, 1000);

  // -------------------------------------------------------------- popup state

  /**
   * Only the popup asks for this, so the one measurement left in the script
   * runs at most once per click instead of several times a second.
   */
  function primaryPlayerIframe() {
    if (inIframe) return null;
    const vw = window.innerWidth || 1;
    const vh = window.innerHeight || 1;
    let best = null;
    let bestArea = 0;
    for (const iframe of document.querySelectorAll("iframe")) {
      const r = iframe.getBoundingClientRect();
      if (r.width < (tuning.embedMinWidth ?? 480) * 0.85) continue;
      if (r.height < (tuning.embedMinHeight ?? 270) * 0.65) continue;
      if (r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) continue;
      const area = r.width * r.height;
      if (area / (vw * vh) < (tuning.iframeMinAreaRatio ?? 0.18)) continue;
      if (area > bestArea) {
        bestArea = area;
        best = iframe;
      }
    }
    return best;
  }

  function currentState() {
    const video = primaryVideo();
    const iframe = video ? null : primaryPlayerIframe();
    const type = video ? videoType(video) : iframe ? "embed" : "";
    return {
      ok: true,
      type,
      typeLabel: type ? WsFillConfig.playerTypeLabel(type) : "",
      typeAllowed: WsFillConfig.isPlayerTypeEnabled(playerTypes, type),
      enabled,
      active: Boolean(video?.hasAttribute(MARK)),
      blacklisted: isBlacklistedNow(),
      fullscreenOnly: isFullscreenOnlySite(),
      fullscreen: isFullscreen() || isHintedFullscreen(),
    };
  }

  WsFillApi.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type !== "wsFillState") return false;
    if (window !== window.top) return false;
    try {
      sendResponse(currentState());
    } catch {
      /* popup closed */
    }
    return false;
  });

  // --------------------------------------------------------------------- boot

  async function boot() {
    try {
      remoteCfg = await WsFillConfig.get();
      mergeGeneric(remoteCfg?.generic);
      WsFillConfig.applySiteOverrides(remoteCfg);
      bindOverrideEvents();
      watchHintedPlayers();
    } catch {
      /* bundled defaults */
    }

    try {
      const pref = await WsFillApi.storage.sync.get({
        [STORAGE_KEY]: true,
        urlBlacklist: [],
        playerTypes: {},
      });
      enabled = pref[STORAGE_KEY] !== false;
      urlBlacklist = WsFillConfig.normalizeBlacklist(pref.urlBlacklist || []);
      playerTypes = WsFillConfig.normalizePlayerTypes(pref.playerTypes);
    } catch {
      return;
    }

    syncAll();
  }

  WsFillApi.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes[STORAGE_KEY]) {
      enabled = changes[STORAGE_KEY].newValue !== false;
      scheduleSync();
    }
    if (area === "sync" && changes.playerTypes) {
      playerTypes = WsFillConfig.normalizePlayerTypes(
        changes.playerTypes.newValue
      );
      scheduleSync();
    }
    if (area === "sync" && changes.urlBlacklist) {
      urlBlacklist = WsFillConfig.normalizeBlacklist(
        changes.urlBlacklist.newValue || []
      );
      scheduleSync();
    }
    if (area === "local" && changes.remoteConfig?.newValue) {
      remoteCfg = WsFillConfig.normalizeConfig(changes.remoteConfig.newValue);
      mergeGeneric(remoteCfg?.generic);
      WsFillConfig.applySiteOverrides(remoteCfg);
      bindOverrideEvents();
      watchHintedPlayers();
      scheduleSync();
    }
  });

  boot();
})();
