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
    pseudoFsExitCoverDelta: 0.08,
    embedMinWidth: 480,
    embedMinHeight: 270,
    embedVideoMinAreaRatio: 0.45,
    iframeMinAreaRatio: 0.18,
    iframeMaxHeightVh: 0.8,
    deepFillContainer: true,
    mobileMaxViewportWidth: 820,
    mobile: {
      mainVideoMinAreaRatio: 0.14,
      mainVideoMinWidthRatio: 0.7,
      mainVideoMinHeightRatio: 0.1,
      mainVideoMinWidth: 240,
      mainVideoMinHeight: 120,
      pseudoFsMinCoverRatio: 0.85,
      pseudoFsExitCoverDelta: 0.08,
      embedMinWidth: 280,
      embedMinHeight: 140,
      embedVideoMinAreaRatio: 0.25,
      iframeMinAreaRatio: 0.08,
      iframeMaxHeightVh: 0.6,
      deepFillContainer: false,
    },
  };

  /**
   * Thresholds in use right now. On a phone in portrait a 16:9 player across
   * the full width covers only ~0.26 of the viewport, well under the desktop
   * minimum, so the mobile block replaces those numbers.
   */
  let tuning = generic;

  const inIframe = window !== window.top;
  /** When we last wrote or reverted a style ourselves. */
  let selfWriteAt = 0;
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

  function isMobileViewport() {
    try {
      if (window.matchMedia?.("(pointer: coarse)")?.matches) return true;
    } catch {
      /* no matchMedia */
    }
    const width = window.innerWidth || 0;
    return width > 0 && width <= (generic.mobileMaxViewportWidth ?? 820);
  }

  /** Recomputed per apply: orientation and window size can change. */
  function refreshTuning() {
    const mobile = generic.mobile;
    tuning =
      mobile && typeof mobile === "object" && isMobileViewport()
        ? { ...generic, ...mobile }
        : generic;
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
    if (w < (tuning.mainVideoMinWidth ?? 280)) return false;
    if (h < (tuning.mainVideoMinHeight ?? 160)) return false;
    const areaRatio = (w * h) / (vw * vh);
    const minArea = tuning.mainVideoMinAreaRatio ?? 0.32;
    const minW = tuning.mainVideoMinWidthRatio ?? 0.5;
    const minH = tuning.mainVideoMinHeightRatio ?? 0.32;
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

  /**
   * True while the page is already being treated as pseudo-fullscreen. The
   * cover ratio is measured on a player we have stretched ourselves, so a bare
   * threshold flips on our own effect: stretch pushes the box over the line,
   * the wider styles change the box again, and the next pass reads it as under
   * the line. The exit threshold sits below the entry one to break that.
   */
  let pseudoLatched = false;

  function findPseudoFullscreenRoot(video, relaxed = false) {
    if (!video || isFullscreen()) return null;
    const { vw, vh } = viewportSize();
    const enterCover = tuning.pseudoFsMinCoverRatio ?? 0.92;
    const minCover = relaxed
      ? enterCover - (tuning.pseudoFsExitCoverDelta ?? 0.08)
      : enterCover;

    let el = video;
    while (el && el !== document.documentElement) {
      const r = el.getBoundingClientRect();
      if (
        r.width >= vw * minCover &&
        r.height >= vh * minCover &&
        r.width >= (tuning.mainVideoMinWidth ?? 280) &&
        r.height >= (tuning.mainVideoMinHeight ?? 160)
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
    if (!video) {
      pseudoLatched = false;
      return false;
    }
    pseudoLatched = Boolean(findPseudoFullscreenRoot(video, pseudoLatched));
    return pseudoLatched;
  }

  /**
   * The shell we size against, cached per epoch. The ancestor walk below picks
   * by viewport ratio, and those ratios are the ones we just changed, so asking
   * again each pass could land on a different ancestor and restyle the player
   * around it. Fullscreen and hint roots are authoritative and stay live.
   */
  const playerRootCache = new WeakMap();

  function findPlayerRoot(video) {
    if (!video) return null;

    const fs = fullscreenRoot();
    if (fs && fs.contains(video)) return fs;

    const hinted = hintedFullscreenPlayer();
    if (hinted && hinted.contains(video)) return hinted;

    const pseudo = findPseudoFullscreenRoot(video, pseudoLatched);
    if (pseudo) return pseudo;

    const cached = playerRootCache.get(video);
    if (
      cached &&
      cached.epoch === hintEpoch &&
      cached.root?.isConnected &&
      cached.root.contains(video)
    ) {
      return cached.root;
    }

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
    playerRootCache.set(video, { epoch: hintEpoch, root: best });
    return best;
  }

  function isPlayerSizedEmbed() {
    if (!inIframe) return false;
    const { vw, vh } = viewportSize();
    const minW = tuning.embedMinWidth ?? 480;
    const minH = tuning.embedMinHeight ?? 270;
    if (vw < minW || vh < minH) return false;

    const video = primaryVideo();
    if (!video) return false;

    const minArea = tuning.embedVideoMinAreaRatio ?? 0.45;
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
    if (primary && orientationOf(primary) === null) {
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

  /**
   * Last orientation we actually measured, per video.
   *
   * videoWidth/videoHeight drop to 0 while a stream seeks or switches
   * representation, so portraitState reports "unknown" for a few frames in the
   * middle of playback. Taken at face value that tears the whole fill down and
   * builds it back up — the screen jumps every time you scrub. The orientation
   * of a clip does not change mid-playback, so keep the last real answer.
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

  function primaryPortrait() {
    const video = primaryVideo();
    if (!video) return null;
    return orientationOf(video);
  }

  /**
   * Inline styles we overwrote, per element: prop -> what the page had there.
   * Players (YouTube writes width/height/left/top straight onto the <video>)
   * size themselves with inline styles, so undo must put those values back
   * instead of deleting the property.
   */
  const originalInline = new WeakMap();

  /**
   * Geometry the player recomputes for itself. A value captured in fullscreen
   * describes the whole screen, so writing it back in windowed mode leaves the
   * video sized for a display it no longer lives on (visible as a cropped,
   * off-centre picture, worst in a split-screen half-width window).
   */
  const GEOMETRY_PROPS = new Set([
    "width",
    "height",
    "left",
    "top",
    "right",
    "bottom",
    "inset",
    "position",
    "max-width",
    "max-height",
    "transform",
    "aspect-ratio",
    "padding-top",
    "padding-bottom",
  ]);

  /** Which layout the page was in when we captured its inline styles. */
  function layoutStamp() {
    return isFullscreen() || isHintedFullscreen() ? "fs" : "win";
  }

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
      stamp: layoutStamp(),
    });
  }

  /** Put one property back the way the page had it. */
  function restoreProp(el, prop, prev) {
    const stale = prev.stamp !== layoutStamp() && GEOMETRY_PROPS.has(prop);
    selfWriteAt = Date.now();
    if (prev.value && !stale) {
      el.style.setProperty(prop, prev.value, prev.priority);
      return false;
    }
    el.style.removeProperty(prop);
    return Boolean(stale && prev.value);
  }

  /**
   * Undo only our own properties on this element; leave the rest alone.
   * Returns true when stale geometry was dropped instead of written back, so
   * the caller can ask the page to re-measure.
   */
  function restoreFill(el) {
    if (!el) return false;
    const saved = originalInline.get(el);
    let dropped = false;
    if (saved) {
      for (const [prop, prev] of saved) {
        if (restoreProp(el, prop, prev)) dropped = true;
      }
      originalInline.delete(el);
    }
    appliedProps.delete(el);
    el.removeAttribute(MARK);
    return dropped;
  }

  let relayoutTimer = 0;

  /**
   * We removed sizing the player had written itself. Players size on window
   * resize, so a synthetic resize makes them put correct values back.
   */
  function nudgeRelayout() {
    if (relayoutTimer) return;
    relayoutTimer = window.setTimeout(() => {
      relayoutTimer = 0;
      try {
        window.dispatchEvent(new Event("resize"));
      } catch {
        /* no dispatch */
      }
    }, 0);
  }

  function clearMarkedStyles() {
    let dropped = false;
    document.querySelectorAll(`[${MARK}]`).forEach((el) => {
      if (restoreFill(el)) dropped = true;
    });
    if (dropped) nudgeRelayout();
  }

  function clearAllVideoStretch() {
    // Marked elements only: an untouched <video> keeps whatever the site set.
    clearMarkedStyles();
  }

  /**
   * Properties we currently hold on an element (el -> Set<prop>), and the set
   * being built by the pass in flight. Re-applying identical styles every pass
   * made the video visibly jump: the page mutates its DOM constantly while a
   * video plays, so a pass ran several times a second, and each one dropped our
   * styles and put them straight back. Writing only actual differences means a
   * pass that changes nothing touches nothing.
   */
  const appliedProps = new WeakMap();
  let passProps = null;

  function beginPass() {
    passProps = new Map();
  }

  /** Revert properties held from earlier passes that this pass no longer wants. */
  function endPass() {
    if (!passProps) return;
    const pass = passProps;
    passProps = null;

    let dropped = false;
    document.querySelectorAll(`[${MARK}]`).forEach((el) => {
      const next = pass.get(el);
      if (!next) {
        if (restoreFill(el)) dropped = true;
        return;
      }
      const prev = appliedProps.get(el);
      const saved = originalInline.get(el);
      if (prev && saved) {
        for (const prop of prev) {
          if (next.has(prop)) continue;
          const was = saved.get(prop);
          if (!was) continue;
          if (restoreProp(el, prop, was)) dropped = true;
          saved.delete(prop);
        }
      }
      appliedProps.set(el, next);
    });
    if (dropped) nudgeRelayout();
  }

  function markFill(el, props, kind = "1") {
    if (!el) return;
    el.setAttribute(MARK, kind);

    let held = passProps?.get(el);
    if (passProps && !held) {
      held = new Set();
      passProps.set(el, held);
    }

    for (const [prop, value] of Object.entries(props)) {
      if (value === "" || value == null) continue;
      held?.add(prop);
      rememberInline(el, prop);
      // Skip the write when it would be a no-op: a style write invalidates
      // layout even when the value is unchanged.
      if (
        el.style.getPropertyValue(prop) === value &&
        el.style.getPropertyPriority(prop) === "important"
      ) {
        continue;
      }
      selfWriteAt = Date.now();
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
   * Letterbox verdicts stay valid until the layout context changes. Measuring
   * again while we hold styles on the element reads back our own work — we
   * zeroed the padding and cleared the aspect-ratio, so the very hints that
   * told us to do it are gone, and the next pass would undo them. Anything
   * that can genuinely change the page's layout bumps the epoch and clears our
   * styles first, so every measurement is taken on an untouched element.
   */
  const hintCache = new WeakMap();
  let hintEpoch = 0;

  function invalidateLayoutState() {
    hintEpoch += 1;
    pseudoLatched = false;
    clearMarkedStyles();
    lastAppliedKey = "";
  }

  /**
   * Every structural decision above is cached per epoch, so something has to
   * notice when the page itself relayouts — a theater-mode toggle changes no
   * window size and fires no event of its own. A ResizeObserver on the video
   * and its shell is that signal, but only when the new size differs from what
   * we recorded at the end of our last pass and we did not just write styles
   * ourselves. Both guards are needed: without them we would react to our own
   * stretch and re-enter forever.
   */
  const SELF_WRITE_QUIET_MS = 300;
  const lastBox = new WeakMap();
  const observedBoxes = new WeakSet();
  let boxTimer = 0;

  function boxOf(el) {
    const r = el.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  }

  function rememberBox(el) {
    if (el) lastBox.set(el, boxOf(el));
  }

  function boxChanged(el) {
    const prev = lastBox.get(el);
    if (!prev) return false;
    const now = boxOf(el);
    return (
      Math.abs(now.w - prev.w) > Math.max(4, prev.w * 0.02) ||
      Math.abs(now.h - prev.h) > Math.max(4, prev.h * 0.02)
    );
  }

  const boxObserver =
    typeof ResizeObserver === "function"
      ? new ResizeObserver((entries) => {
          if (Date.now() - selfWriteAt < SELF_WRITE_QUIET_MS) {
            entries.forEach((e) => rememberBox(e.target));
            return;
          }
          if (!entries.some((e) => boxChanged(e.target))) return;
          if (boxTimer) return;
          boxTimer = window.setTimeout(() => {
            boxTimer = 0;
            invalidateLayoutState();
            scheduleApply();
          }, 120);
        })
      : null;

  function watchBox(el) {
    if (!el || !boxObserver || observedBoxes.has(el)) return;
    observedBoxes.add(el);
    try {
      boxObserver.observe(el);
    } catch {
      /* detached */
    }
  }

  function letterboxHintsFor(el) {
    const cached = hintCache.get(el);
    if (cached && cached.epoch === hintEpoch) return cached.hints;
    const hints = letterboxHints(el);
    hintCache.set(el, { epoch: hintEpoch, hints });
    return hints;
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

  const CONTROL_SELECTOR =
    "button, a[href], input, select, textarea, [role=\"button\"], " +
    "[role=\"slider\"], [role=\"menu\"], [role=\"menuitem\"], [tabindex]";

  /**
   * A wrapper that holds controls is part of the player UI, not a letterbox.
   *
   * Latched, because players add and remove their control bar as the pointer
   * moves over the video. Asking live made the answer flip on hover alone, and
   * with it whether we pinned this box — the video jumped every time the mouse
   * reached the buttons. A box that has ever held controls is player UI and
   * stays that way.
   */
  const everHeldControls = new WeakSet();

  function holdsControls(el) {
    if (!el) return false;
    if (everHeldControls.has(el)) return true;
    let found = false;
    try {
      found = Boolean(el.querySelector(CONTROL_SELECTOR));
    } catch {
      return false;
    }
    if (found) everHeldControls.add(el);
    return found;
  }

  /**
   * Absolute fill needs the player shell to be the containing block and to have
   * a usable box. Make it position:relative when it is static.
   *
   * The verdict is cached per epoch: after we set position:relative, reading
   * the position back reports our own value, so a live check would decide the
   * shell no longer needs it, drop it the same pass, and hand the pinned video
   * a different containing block — a visible jump, every pass.
   */
  const anchorCache = new WeakMap();

  function canAnchorFill(root) {
    if (!root || root === document.body || root === document.documentElement) {
      return false;
    }
    const r = root.getBoundingClientRect();
    if (r.width < (tuning.mainVideoMinWidth ?? 280)) return false;
    if (r.height < (tuning.mainVideoMinHeight ?? 160)) return false;

    const cached = anchorCache.get(root);
    let needsRelative;
    if (cached && cached.epoch === hintEpoch) {
      needsRelative = cached.needsRelative;
    } else {
      let pos = "static";
      try {
        pos = getComputedStyle(root).position;
      } catch {
        return false;
      }
      needsRelative = pos === "static";
      anchorCache.set(root, { epoch: hintEpoch, needsRelative });
    }

    // Re-assert every pass so the property stays in this pass's held set.
    if (needsRelative) markFill(root, { position: "relative" }, "wrap");
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
      const hints = letterboxHintsFor(el);
      if (hints.any) adaptLetterboxNode(el, hints);
      el = el.parentElement;
    }

    // Soft-adapt the shell itself when it letterboxes.
    const rootHints = letterboxHintsFor(root);
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
    const pinContainer =
      (tuning.deepFillContainer ?? true) &&
      container &&
      root.contains(container) &&
      container !== root &&
      // Pinning a node that also holds the play/settings buttons turns it into
      // a transparent overlay on top of them, which swallows clicks and taps.
      !holdsControls(container);

    if (pinContainer) {
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
          // A box we forced over the player must never take input itself.
          "pointer-events": "none",
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
      // Undo the wrapper's pointer-events:none for the video itself.
      "pointer-events": "auto",
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
    const minW = tuning.embedMinWidth ?? 480;
    const minH = (tuning.embedMinHeight ?? 270) * 0.65;
    if (r.width < minW * 0.85 || r.height < minH) return false;

    const areaRatio = (r.width * r.height) / (vw * vh);
    const minArea = tuning.iframeMinAreaRatio ?? 0.18;
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
    const maxVh = tuning.iframeMaxHeightVh ?? 0.8;
    const rect = iframe.getBoundingClientRect();
    const targetH = Math.max(
      rect.height,
      Math.min(vh * maxVh, Math.max(rect.width * 0.5625, tuning.embedMinHeight ?? 270))
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
      const hints = letterboxHintsFor(el);
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

    beginPass();

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

      const state = orientationOf(video);
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

    endPass();

    // Baseline for the box observer: the sizes our own work just settled on.
    const watched = primaryVideo();
    if (watched) {
      const shell = findPlayerRoot(watched);
      watchBox(watched);
      rememberBox(watched);
      if (shell) {
        watchBox(shell);
        rememberBox(shell);
      }
    }
  }

  function apply() {
    refreshTuning();
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
    // A hidden tab cannot show anything; re-apply when it comes back instead.
    if (document.hidden) return;
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
    invalidateLayoutState();
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
          invalidateLayoutState();
          scheduleApply();
        });
      }
    }
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) return;
    lastAppliedKey = "";
    scheduleApply();
  });

  /**
   * The player rewrites its own inline geometry a frame or two after the event
   * fires, and the class a fullscreenHint keys on can lag too. Re-check after
   * the page settles so the previous state's sizing is never what sticks.
   */
  function onFullscreenChange() {
    invalidateLayoutState();
    apply();
    window.requestAnimationFrame(() => {
      lastAppliedKey = "";
      apply();
    });
    window.setTimeout(() => {
      lastAppliedKey = "";
      apply();
    }, 250);
  }

  document.addEventListener("fullscreenchange", onFullscreenChange);
  document.addEventListener("webkitfullscreenchange", onFullscreenChange);
  window.addEventListener("popstate", () => {
    invalidateLayoutState();
    scheduleApply();
  });

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    // Our own nudgeRelayout dispatches resize, and players resize themselves in
    // bursts. Re-measure once the burst is over, not per event.
    lastAppliedKey = "";
    if (resizeTimer) window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      resizeTimer = 0;
      invalidateLayoutState();
      scheduleApply();
    }, 150);
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
    if (!enabled || document.hidden) return;
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      invalidateLayoutState();
      watchHintedPlayers();
      scheduleApply();
      return;
    }
    // The page re-rendered the player and dropped our inline styles.
    if (marksLost()) {
      invalidateLayoutState();
      scheduleApply();
    }
  }, 1000);

  async function boot() {
    try {
      remoteCfg = await WsFillConfig.get();
      if (remoteCfg?.generic) {
        generic = {
          ...generic,
          ...remoteCfg.generic,
          mobile: { ...generic.mobile, ...(remoteCfg.generic.mobile || {}) },
        };
      }
      refreshTuning();
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
        generic = {
          ...generic,
          ...remoteCfg.generic,
          mobile: { ...generic.mobile, ...(remoteCfg.generic.mobile || {}) },
        };
        refreshTuning();
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
