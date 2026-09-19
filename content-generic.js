(() => {
  // Restricted / dead frames: bail before any extension API calls.
  try {
    if (!WsFillApi?.runtime?.id || !WsFillApi?.storage?.sync) return;
  } catch {
    return;
  }

  const ROOT = "ws-fill-active";
  const EMBED = "ws-fill-embed";
  const FS = "ws-fill-fs";
  const PSEUDO = "ws-fill-pseudo";
  const PAGE = "ws-fill-page";
  const PORTRAIT = "ws-fill-portrait";
  const STORAGE_KEY = "enabled";
  const MARK = "data-ws-fill";

  let enabled = true;
  let urlBlacklist = [];
  let playerTypes = WsFillConfig.defaultPlayerTypes();
  const drmVideos = new WeakSet();
  const trackedVideos = new WeakSet();
  let generic = {
    embedStretchHosts: "viduki\\.net|embedsports\\.me",
    mainVideoMinAreaRatio: 0.32,
    mainVideoMinWidthRatio: 0.5,
    mainVideoMinHeightRatio: 0.32,
    pseudoFsMinCoverRatio: 0.92,
    embedMinWidth: 480,
    embedMinHeight: 270,
    embedVideoMinAreaRatio: 0.45,
    iframeMinAreaRatio: 0.18,
    iframeMaxHeightVh: 0.8,
  };

  const inIframe = window !== window.top;
  let applyTimer = 0;
  let lastAppliedKey = "";
  let remoteCfg = null;

  function hostRe(pattern) {
    if (!pattern) return null;
    try {
      return new RegExp(pattern, "i");
    } catch {
      return null;
    }
  }

  function hostMatches(pattern, text) {
    const re = hostRe(pattern);
    if (!re) return false;
    try {
      return re.test(text || location.hostname + " " + location.href);
    } catch {
      return false;
    }
  }

  function isSafeEmbedHost(text) {
    return hostMatches(generic.embedStretchHosts, text);
  }

  function isFullscreen() {
    return Boolean(
      document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
    );
  }

  function pageOverrides() {
    return WsFillConfig.matchingOverrides(remoteCfg || {});
  }

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

  function isFullscreenOnlySite() {
    return pageOverrides().some((o) => o.fullscreenOnly);
  }

  function toggleOverrideActiveClasses(active) {
    const portrait = primaryPortrait() === true;
    const fsOk = isFullscreen() || isHintedFullscreen();
    const matched = pageOverrides();
    const matchedIds = new Set(matched.map((o) => o.activeClass).filter(Boolean));

    for (const o of matched) {
      if (!o.activeClass) continue;
      const on =
        active &&
        !portrait &&
        (o.fullscreenOnly ? fsOk : true);
      document.body?.classList.toggle(o.activeClass, on);
      document.documentElement.classList.toggle(o.activeClass, on);
    }

    for (const o of remoteCfg?.overrides || []) {
      if (!o?.activeClass || matchedIds.has(o.activeClass)) continue;
      if (!WsFillConfig.overrideMatches(o.match)) {
        document.body?.classList.remove(o.activeClass);
        document.documentElement.classList.remove(o.activeClass);
      }
    }
  }

  function fullscreenRoot() {
    return (
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement ||
      null
    );
  }

  function viewportSize() {
    return {
      vw: window.innerWidth || 1,
      vh: window.innerHeight || 1,
    };
  }

  function isMainPlayerVideo(video) {
    const { vw, vh } = viewportSize();
    const w = video.clientWidth;
    const h = video.clientHeight;
    if (w < 280 || h < 160) return false;
    const areaRatio = (w * h) / (vw * vh);
    const minArea = generic.mainVideoMinAreaRatio ?? 0.32;
    const minW = generic.mainVideoMinWidthRatio ?? 0.5;
    const minH = generic.mainVideoMinHeightRatio ?? 0.32;
    return areaRatio >= minArea || (w / vw >= minW && h / vh >= minH);
  }

  function isRenderedBox(el) {
    try {
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none") return false;
      if (parseFloat(style.opacity) === 0) return false;
    } catch {
      return false;
    }
    return true;
  }

  function visibleVideos() {
    return [...document.querySelectorAll("video")].filter(
      (v) => v.clientWidth >= 120 && v.clientHeight >= 80 && isRenderedBox(v)
    );
  }

  function primaryVideo() {
    const videos = visibleVideos().sort(
      (a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight
    );
    return videos[0] || null;
  }

  function hasMainPlayerVideo() {
    return visibleVideos().some(isMainPlayerVideo);
  }

  function findPseudoFullscreenRoot(video) {
    if (!video || isFullscreen()) return null;
    const { vw, vh } = viewportSize();
    const minCover = generic.pseudoFsMinCoverRatio ?? 0.92;

    let el = video;
    while (el && el !== document.documentElement) {
      const r = el.getBoundingClientRect();
      if (
        r.width >= vw * minCover &&
        r.height >= vh * minCover &&
        r.width >= 280 &&
        r.height >= 160
      ) {
        if (el === document.body) return null;
        return el;
      }
      el = el.parentElement;
    }
    return null;
  }

  function isPseudoFullscreen() {
    const video = primaryVideo();
    if (!video) return false;
    return Boolean(findPseudoFullscreenRoot(video));
  }

  function findPlayerRoot(video) {
    if (!video) return null;

    const fs = fullscreenRoot();
    if (fs && fs.contains(video)) return fs;

    const hinted = hintedFullscreenPlayer();
    if (hinted && hinted.contains(video)) return hinted;

    const pseudo = findPseudoFullscreenRoot(video);
    if (pseudo) return pseudo;

    const { vw, vh } = viewportSize();
    let best = video.parentElement;
    let el = video.parentElement;
    while (el && el !== document.body && el !== document.documentElement) {
      const r = el.getBoundingClientRect();
      const vwR = r.width / vw;
      const vhR = r.height / vh;
      if (vwR >= 0.35 && vhR >= 0.28 && vwR < 0.99 && vhR < 0.99) {
        best = el;
      }
      el = el.parentElement;
    }
    return best;
  }

  function isPlayerSizedEmbed() {
    if (!inIframe) return false;
    const { vw, vh } = viewportSize();
    const minW = generic.embedMinWidth ?? 480;
    const minH = generic.embedMinHeight ?? 270;
    if (vw < minW || vh < minH) return false;

    const video = primaryVideo();
    if (!video) return false;

    const minArea = generic.embedVideoMinAreaRatio ?? 0.45;
    const areaRatio =
      (video.clientWidth * video.clientHeight) / (vw * vh);
    return areaRatio >= minArea || isMainPlayerVideo(video);
  }

  /** Watch for EME so a protected player is recognised as drm, not mse. */
  function trackVideo(video) {
    if (!video || trackedVideos.has(video)) return;
    trackedVideos.add(video);
    video.addEventListener(
      "encrypted",
      () => {
        drmVideos.add(video);
        lastAppliedKey = "";
        scheduleApply();
      },
      { once: true }
    );
  }

  function videoType(video) {
    if (!video) return "";
    trackVideo(video);
    return WsFillConfig.detectPlayerType(video, {
      inIframe,
      drmSeen: drmVideos.has(video),
    });
  }

  function typeAllowed(video) {
    return WsFillConfig.isPlayerTypeEnabled(playerTypes, videoType(video));
  }

  function embedTypeAllowed() {
    return WsFillConfig.isPlayerTypeEnabled(playerTypes, "embed");
  }

  function onVideoMetadata() {
    lastAppliedKey = "";
    scheduleApply();
  }

  function isBlacklistedNow() {
    return WsFillConfig.isUrlBlacklisted(urlBlacklist, location.href);
  }

  function shouldStretchContext() {
    if (!enabled || isBlacklistedNow()) return false;

    // Orientation unknown yet (no loadedmetadata): staying off avoids stretching
    // a portrait clip and avoids filling a box the player has not sized yet.
    const primary = primaryVideo();
    if (primary && WsFillConfig.portraitState(primary) === null) {
      primary.addEventListener("loadedmetadata", onVideoMetadata, {
        once: true,
      });
      return false;
    }

    // Player type switched off in the popup.
    if (primary && !typeAllowed(primary)) return false;

    const fs = isFullscreen() || isHintedFullscreen();
    // YouTube-style sites: only stretch in (hinted) fullscreen.
    if (isFullscreenOnlySite()) return fs;

    if (fs) return true;
    if (isPseudoFullscreen()) return true;
    if (!inIframe && hasMainPlayerVideo()) return true;
    if (!inIframe && embedTypeAllowed() && findPrimaryPlayerIframe()) return true;
    if (inIframe && document.querySelector("video")) {
      if (isSafeEmbedHost() || isPlayerSizedEmbed()) return true;
    }
    return false;
  }

  function primaryPortrait() {
    const video = primaryVideo();
    if (!video) return null;
    return WsFillConfig.portraitState(video);
  }

  /**
   * Inline styles we overwrote, per element: prop -> what the page had there.
   * Players (YouTube writes width/height/left/top straight onto the <video>)
   * size themselves with inline styles, so undo must put those values back
   * instead of deleting the property.
   */
  const originalInline = new WeakMap();

  function rememberInline(el, prop) {
    let saved = originalInline.get(el);
    if (!saved) {
      saved = new Map();
      originalInline.set(el, saved);
    }
    if (saved.has(prop)) return;
    saved.set(prop, {
      value: el.style.getPropertyValue(prop),
      priority: el.style.getPropertyPriority(prop),
    });
  }

  /** Undo only our own properties on this element; leave the rest alone. */
  function restoreFill(el) {
    if (!el) return;
    const saved = originalInline.get(el);
    if (saved) {
      for (const [prop, prev] of saved) {
        if (prev.value) el.style.setProperty(prop, prev.value, prev.priority);
        else el.style.removeProperty(prop);
      }
      originalInline.delete(el);
    }
    el.removeAttribute(MARK);
  }

  function clearMarkedStyles() {
    document.querySelectorAll(`[${MARK}]`).forEach(restoreFill);
  }

  function clearAllVideoStretch() {
    // Marked elements only: an untouched <video> keeps whatever the site set.
    clearMarkedStyles();
  }

  function markFill(el, props, kind = "1") {
    if (!el) return;
    el.setAttribute(MARK, kind);
    for (const [prop, value] of Object.entries(props)) {
      if (value === "" || value == null) continue;
      rememberInline(el, prop);
      el.style.setProperty(prop, value, "important");
    }
  }

  function parseScale(transform) {
    if (!transform || transform === "none") return 1;
    const m = transform.match(/^matrix\(([^)]+)\)$/);
    if (m) {
      const parts = m[1].split(",").map((n) => parseFloat(n.trim()));
      if (parts.length >= 4 && Number.isFinite(parts[0])) {
        return Math.abs(parts[0]);
      }
    }
    const s = transform.match(/scale\(\s*([-\d.]+)/i);
    if (s) return Math.abs(parseFloat(s[1])) || 1;
    return 1;
  }

  /**
   * Structural letterbox patterns common across players (not site-specific).
   */
  function letterboxHints(el) {
    if (!el || el === document.body || el === document.documentElement) {
      return { any: false };
    }
    const style = getComputedStyle(el);
    const hints = {
      aspectRatio: false,
      paddingHack: false,
      transformScale: false,
      maxBox: false,
    };

    if (style.aspectRatio && style.aspectRatio !== "auto") {
      hints.aspectRatio = true;
    }

    const pb = parseFloat(style.paddingBottom) || 0;
    const pt = parseFloat(style.paddingTop) || 0;
    const h = el.clientHeight;
    // Classic 16:9 padding hack: large vertical padding, tiny content height.
    if ((pb > 24 || pt > 24) && h > 0 && (pb + pt) / h > 0.2) {
      hints.paddingHack = true;
    } else if ((pb > 40 || pt > 40) && parseFloat(style.height) === 0) {
      hints.paddingHack = true;
    }

    const scale = parseScale(style.transform);
    if (scale > 0 && (scale < 0.97 || scale > 1.03)) {
      hints.transformScale = true;
    }

    // Only treat a max-width/max-height as a letterbox clamp when it is an
    // absolute length the element actually hits. "max-width: 100%" or a cap the
    // box never reaches is normal layout, not letterboxing.
    const maxW = /px$/.test(style.maxWidth) ? parseFloat(style.maxWidth) : NaN;
    const maxH = /px$/.test(style.maxHeight) ? parseFloat(style.maxHeight) : NaN;
    const clampsW = Number.isFinite(maxW) && maxW > 0 && el.clientWidth >= maxW - 1;
    const clampsH = Number.isFinite(maxH) && maxH > 0 && el.clientHeight >= maxH - 1;
    if (clampsW || clampsH) hints.maxBox = true;

    hints.any =
      hints.aspectRatio ||
      hints.paddingHack ||
      hints.transformScale ||
      hints.maxBox;
    return hints;
  }

  function adaptLetterboxNode(el, hints) {
    const props = {
      "max-width": "none",
      "max-height": "none",
      width: "100%",
    };

    // height:100% is only safe on nodes that letterbox structurally; on a plain
    // max-width wrapper it collapses to 0 (invisible video) or blows up flex/grid.
    const structural =
      hints.aspectRatio || hints.paddingHack || hints.transformScale;
    if (structural) props.height = "100%";

    if (hints.aspectRatio) props["aspect-ratio"] = "auto";
    if (hints.paddingHack) {
      props["padding-top"] = "0";
      props["padding-bottom"] = "0";
    }
    if (hints.transformScale) {
      props.transform = "none";
      props["transform-origin"] = "center center";
    }

    markFill(el, props, "wrap");
  }

  /**
   * Absolute fill needs the player shell to be the containing block and to have
   * a usable box. Make it position:relative when it is static.
   */
  function canAnchorFill(root) {
    if (!root || root === document.body || root === document.documentElement) {
      return false;
    }
    const r = root.getBoundingClientRect();
    if (r.width < 280 || r.height < 160) return false;
    let pos = "static";
    try {
      pos = getComputedStyle(root).position;
    } catch {
      return false;
    }
    if (pos === "static") markFill(root, { position: "relative" }, "wrap");
    return true;
  }

  /**
   * Walk video → player root and neutralize letterbox wrappers.
   * Deep fill (FS / pseudo) also pins video + immediate container.
   */
  function adaptStructureToRoot(video, { deepFill }) {
    const root = findPlayerRoot(video) || video.parentElement;
    if (!root) {
      markFill(video, {
        "object-fit": "fill",
        "object-position": "center center",
        width: "100%",
        height: "100%",
        "max-width": "none",
        "max-height": "none",
        transform: "none",
      });
      return;
    }

    let el = video.parentElement;
    while (el && el !== root && el !== document.body) {
      const hints = letterboxHints(el);
      if (hints.any) adaptLetterboxNode(el, hints);
      el = el.parentElement;
    }

    // Soft-adapt the shell itself when it letterboxes.
    const rootHints = letterboxHints(root);
    if (rootHints.any) {
      const props = {
        "max-width": "none",
        "max-height": "none",
      };
      if (rootHints.aspectRatio) props["aspect-ratio"] = "auto";
      if (rootHints.paddingHack) {
        props["padding-top"] = "0";
        props["padding-bottom"] = "0";
      }
      if (rootHints.transformScale) props.transform = "none";
      markFill(root, props, "wrap");
    }

    markFill(video, {
      "object-fit": "fill",
      "object-position": "center center",
      width: "100%",
      height: "100%",
      "max-width": "none",
      "max-height": "none",
      transform: "none",
    });

    if (!deepFill) return;

    // Pinning with position:absolute only works if the shell is a containing
    // block with a real box. Otherwise the video escapes to some far ancestor
    // (or a 0-height box) and disappears / renders in the wrong place.
    if (!canAnchorFill(root)) return;

    const container = video.parentElement;
    if (container && root.contains(container) && container !== root) {
      markFill(
        container,
        {
          position: "absolute",
          inset: "0",
          left: "0",
          top: "0",
          width: "100%",
          height: "100%",
          transform: "none",
        },
        "wrap"
      );
    }

    markFill(video, {
      position: "absolute",
      inset: "0",
      left: "0",
      top: "0",
      width: "100%",
      height: "100%",
      "max-width": "none",
      "max-height": "none",
      transform: "none",
      "object-fit": "fill",
      "object-position": "center center",
    });
  }

  function iframeSrcText(iframe) {
    try {
      const src =
        iframe.currentSrc ||
        iframe.src ||
        iframe.getAttribute("src") ||
        iframe.getAttribute("data-src") ||
        "";
      return src + " " + (iframe.getAttribute("allow") || "");
    } catch {
      return "";
    }
  }

  function isPrimaryPlayerIframeCandidate(iframe) {
    if (!iframe || iframe.closest(`[${MARK}="ignore"]`)) return false;
    const r = iframe.getBoundingClientRect();
    const { vw, vh } = viewportSize();
    const minW = generic.embedMinWidth ?? 480;
    const minH = (generic.embedMinHeight ?? 270) * 0.65;
    if (r.width < minW * 0.85 || r.height < minH) return false;

    const areaRatio = (r.width * r.height) / (vw * vh);
    const minArea = generic.iframeMinAreaRatio ?? 0.18;
    if (areaRatio < minArea && !isSafeEmbedHost(iframeSrcText(iframe))) {
      return false;
    }

    // Skip tiny/hidden or off-screen frames.
    if (r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) return false;
    return true;
  }

  function findPrimaryPlayerIframe() {
    if (inIframe) return null;
    const frames = [...document.querySelectorAll("iframe")].filter(
      isPrimaryPlayerIframeCandidate
    );
    if (!frames.length) return null;
    frames.sort((a, b) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      return rb.width * rb.height - ra.width * ra.height;
    });
    return frames[0];
  }

  /**
   * Parent-page adapter: widen the primary stream iframe so the embed
   * can use the full content width (TvSportsLive-style, but generic).
   */
  function adaptPrimaryIframe() {
    if (inIframe) return null;
    const iframe = findPrimaryPlayerIframe();
    if (!iframe) return null;

    const { vh } = viewportSize();
    const maxVh = generic.iframeMaxHeightVh ?? 0.8;
    const rect = iframe.getBoundingClientRect();
    const targetH = Math.max(
      rect.height,
      Math.min(vh * maxVh, Math.max(rect.width * 0.5625, generic.embedMinHeight ?? 270))
    );

    markFill(
      iframe,
      {
        width: "100%",
        "max-width": "none",
        height: `${Math.round(targetH)}px`,
        "max-height": "none",
        display: "block",
        "aspect-ratio": "auto",
      },
      "iframe"
    );

    // Soft-widen immediate wrappers that clamp the iframe.
    let el = iframe.parentElement;
    let hops = 0;
    while (el && el !== document.body && hops < 4) {
      const hints = letterboxHints(el);
      if (hints.any || hints.maxBox) {
        markFill(
          el,
          {
            width: "100%",
            "max-width": "none",
            "aspect-ratio": hints.aspectRatio ? "auto" : undefined,
          },
          "wrap"
        );
      }
      el = el.parentElement;
      hops += 1;
    }

    return iframe;
  }

  function stretchVideos() {
    const portrait = primaryPortrait();
    const root = document.documentElement;
    const body = document.body;
    root.classList.toggle(PORTRAIT, portrait === true);
    body?.classList.toggle(PORTRAIT, portrait === true);

    if (portrait === true) {
      clearAllVideoStretch();
      return;
    }

    clearMarkedStyles();

    const fsOrPseudo =
      isFullscreen() || isPseudoFullscreen() || isHintedFullscreen();
    const hasLocalMain = hasMainPlayerVideo();

    // Parent pages that host a large player iframe (no local <video>).
    if (
      !inIframe &&
      !hasLocalMain &&
      !isFullscreenOnlySite() &&
      embedTypeAllowed()
    ) {
      adaptPrimaryIframe();
    }

    document.querySelectorAll("video").forEach((video) => {
      if (!inIframe && !fsOrPseudo && !isMainPlayerVideo(video)) {
        restoreFill(video);
        return;
      }

      if (!typeAllowed(video)) {
        restoreFill(video);
        return;
      }

      const state = WsFillConfig.portraitState(video);
      if (state === true) {
        restoreFill(video);
        return;
      }
      if (state === null) {
        video.addEventListener("loadedmetadata", scheduleApply, { once: true });
        return;
      }

      adaptStructureToRoot(video, {
        deepFill: fsOrPseudo || inIframe,
      });
    });
  }

  function apply() {
    if (remoteCfg) WsFillConfig.applySiteOverrides(remoteCfg);
    watchHintedPlayers();

    const root = document.documentElement;
    const body = document.body;
    const fs = isFullscreen() || isHintedFullscreen();
    const pseudo = !fs && isPseudoFullscreen();
    const active = shouldStretchContext();
    const primaryIframe =
      !inIframe && !isFullscreenOnlySite() && embedTypeAllowed()
        ? findPrimaryPlayerIframe()
        : null;
    const pageMode =
      enabled &&
      !inIframe &&
      !fs &&
      !pseudo &&
      !isFullscreenOnlySite() &&
      (hasMainPlayerVideo() || Boolean(primaryIframe)) &&
      !isBlacklistedNow();
    const embedMode =
      enabled &&
      inIframe &&
      active &&
      (isSafeEmbedHost() || isPlayerSizedEmbed());

    const key = [
      enabled,
      active,
      videoType(primaryVideo()),
      JSON.stringify(playerTypes),
      pageMode,
      embedMode,
      fs,
      pseudo,
      isHintedFullscreen(),
      inIframe,
      location.href,
      primaryPortrait(),
      primaryVideo()?.clientWidth,
      primaryVideo()?.clientHeight,
      primaryIframe?.clientWidth,
      primaryIframe?.clientHeight,
    ].join("|");
    if (key === lastAppliedKey) return;
    lastAppliedKey = key;

    root.classList.toggle(ROOT, enabled && active);
    body?.classList.toggle(ROOT, enabled && active);
    root.classList.toggle(EMBED, embedMode);
    body?.classList.toggle(EMBED, embedMode);
    root.classList.toggle(FS, enabled && fs && active);
    body?.classList.toggle(FS, enabled && fs && active);
    root.classList.toggle(PSEUDO, enabled && pseudo && active);
    body?.classList.toggle(PSEUDO, enabled && pseudo && active);
    root.classList.toggle(PAGE, pageMode);
    body?.classList.toggle(PAGE, pageMode);
    toggleOverrideActiveClasses(enabled && active);

    if (active) stretchVideos();
    else {
      root.classList.remove(PORTRAIT);
      body?.classList.remove(PORTRAIT);
      clearAllVideoStretch();
    }
  }

  /** Popup asks the top frame what it is looking at. */
  function currentState() {
    const video = primaryVideo();
    const iframe =
      !inIframe && embedTypeAllowed() ? findPrimaryPlayerIframe() : null;
    const type = video ? videoType(video) : iframe ? "embed" : "";
    return {
      ok: true,
      type,
      typeLabel: type ? WsFillConfig.playerTypeLabel(type) : "",
      typeAllowed: WsFillConfig.isPlayerTypeEnabled(playerTypes, type),
      enabled,
      active: document.documentElement.classList.contains(ROOT),
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

  function scheduleApply() {
    if (applyTimer) return;
    applyTimer = window.setTimeout(() => {
      applyTimer = 0;
      apply();
    }, 300);
  }

  const observer = new MutationObserver(() => {
    if (!enabled) return;
    scheduleApply();
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  const hintObserver = new MutationObserver(() => {
    lastAppliedKey = "";
    scheduleApply();
  });
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
          lastAppliedKey = "";
          scheduleApply();
        });
      }
    }
  }

  document.addEventListener("fullscreenchange", () => {
    lastAppliedKey = "";
    apply();
  });
  document.addEventListener("webkitfullscreenchange", () => {
    lastAppliedKey = "";
    apply();
  });
  window.addEventListener("popstate", () => {
    lastAppliedKey = "";
    scheduleApply();
  });

  window.addEventListener("resize", () => {
    lastAppliedKey = "";
    scheduleApply();
  });

  function marksLost() {
    if (!document.documentElement.classList.contains(ROOT)) return false;
    if (document.querySelector(`video[${MARK}]`)) return false;
    if (primaryPortrait() === true) return false;
    return inIframe
      ? Boolean(document.querySelector("video"))
      : hasMainPlayerVideo();
  }

  let lastUrl = location.href;
  setInterval(() => {
    if (!enabled) return;
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      lastAppliedKey = "";
      watchHintedPlayers();
      scheduleApply();
      return;
    }
    // The page re-rendered the player and dropped our inline styles.
    if (marksLost()) {
      lastAppliedKey = "";
      scheduleApply();
    }
  }, 1000);

  async function boot() {
    try {
      remoteCfg = await WsFillConfig.get();
      if (remoteCfg?.generic) generic = { ...generic, ...remoteCfg.generic };
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
    apply();
  }

  WsFillApi.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes[STORAGE_KEY]) {
      enabled = changes[STORAGE_KEY].newValue !== false;
      lastAppliedKey = "";
      scheduleApply();
    }
    if (area === "sync" && changes.playerTypes) {
      playerTypes = WsFillConfig.normalizePlayerTypes(
        changes.playerTypes.newValue
      );
      lastAppliedKey = "";
      scheduleApply();
    }
    if (area === "sync" && changes.urlBlacklist) {
      urlBlacklist = WsFillConfig.normalizeBlacklist(
        changes.urlBlacklist.newValue || []
      );
      lastAppliedKey = "";
      scheduleApply();
    }
    if (area === "local" && changes.remoteConfig?.newValue) {
      remoteCfg = WsFillConfig.normalizeConfig(changes.remoteConfig.newValue);
      if (remoteCfg?.generic) {
        generic = { ...generic, ...remoteCfg.generic };
      }
      WsFillConfig.applySiteOverrides(remoteCfg);
      bindOverrideEvents();
      watchHintedPlayers();
      lastAppliedKey = "";
      scheduleApply();
    }
  });

  boot();
})();
