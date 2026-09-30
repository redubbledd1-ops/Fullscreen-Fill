/*
 * Fullscreen Fill — fullscreen diagnostics.
 *
 * Paste into the console of the page (desktop Firefox → about:debugging →
 * your phone → inspect the m.youtube.com tab). Then put the video in
 * fullscreen on the phone. After 6 seconds a report is logged and, where the
 * console allows it, copied to the clipboard as JSON.
 *
 * Run wsDiag() again at any time for a fresh report. Nothing here changes the
 * page; it only reads.
 */
(() => {
  function describe(el) {
    if (!el) return null;
    if (el === document.documentElement) return "html";
    let s = el.tagName.toLowerCase();
    if (el.id) s += "#" + el.id;
    const cls = typeof el.className === "string" ? el.className.trim() : "";
    if (cls) s += "." + cls.split(/\s+/).slice(0, 8).join(".");
    return s;
  }

  function box(el) {
    const r = el.getBoundingClientRect();
    return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)].join(",");
  }

  // Properties that make an ancestor the containing block for position:fixed,
  // or otherwise clip / resize what is inside it.
  const TRAPS = ["transform", "perspective", "filter", "backdropFilter", "contain", "willChange", "containerType"];

  function ancestorInfo(el) {
    const cs = getComputedStyle(el);
    const out = {
      el: describe(el),
      box: box(el),
      position: cs.position,
      overflow: cs.overflow,
    };
    const traps = {};
    for (const p of TRAPS) {
      const v = cs[p];
      if (v && v !== "none" && v !== "auto" && v !== "normal") traps[p] = v;
    }
    if (Object.keys(traps).length) out.fixedTrap = traps;
    return out;
  }

  function videoInfo(v) {
    const cs = getComputedStyle(v);
    const attrs = {};
    for (const a of v.getAttributeNames()) {
      if (a.startsWith("data-ws")) attrs[a] = v.getAttribute(a);
    }
    const chain = [];
    const fs = document.fullscreenElement;
    for (let p = v.parentElement; p; p = p.parentElement) {
      chain.push(ancestorInfo(p));
      if (p === fs || p === document.body) break;
    }
    return {
      el: describe(v),
      wsAttrs: attrs,
      picture: `${v.videoWidth}x${v.videoHeight}`,
      box: box(v),
      client: `${v.clientWidth}x${v.clientHeight}`,
      src: (v.currentSrc || v.src || "").slice(0, 20),
      paused: v.paused,
      isFullscreenEl: v === fs,
      insideFullscreenEl: Boolean(fs && fs !== v && fs.contains(v)),
      computed: {
        position: cs.position,
        inset: [cs.top, cs.right, cs.bottom, cs.left].join(" "),
        width: cs.width,
        height: cs.height,
        maxWidth: cs.maxWidth,
        maxHeight: cs.maxHeight,
        objectFit: cs.objectFit,
        transform: cs.transform,
        wsFillFit: cs.getPropertyValue("--ws-fill-fit").trim(),
      },
      inlineStyle: v.getAttribute("style") || "",
      ancestors: chain,
    };
  }

  function report() {
    const html = document.documentElement;
    const body = document.body;
    const fs = document.fullscreenElement || document.webkitFullscreenElement || null;
    const players = [...document.querySelectorAll(".html5-video-player")];
    const wsClasses = (el) =>
      el ? [...el.classList].filter((c) => c.startsWith("ws-fill") || c === "yt-fill-active") : [];

    return {
      when: new Date().toISOString(),
      url: location.href,
      ua: navigator.userAgent,
      viewport: `${innerWidth}x${innerHeight} @${devicePixelRatio}`,
      screen: `${screen.width}x${screen.height} ${screen.orientation?.type || ""}`,
      pointerCoarse: matchMedia("(pointer: coarse)").matches,

      // No ws-fill-active anywhere = the content script did not run
      // (extension off, site blocked, or no host permission).
      extension: {
        htmlClasses: wsClasses(html),
        bodyClasses: wsClasses(body),
        overrideStyleInjected: Boolean(document.getElementById("ws-fill-override-style")),
        markedVideos: document.querySelectorAll("video[data-ws-fill]").length,
      },

      fullscreen: {
        element: describe(fs),
        elementIsHtml: fs === html,
        elementBox: fs ? box(fs) : null,
        htmlMatchesFullscreen: html.matches(":fullscreen"),
      },

      youtubePlayers: players.map((p) => ({
        el: describe(p),
        box: box(p),
        ytpFullscreen: p.classList.contains("ytp-fullscreen"),
      })),

      videos: [...document.querySelectorAll("video")].map(videoInfo),
    };
  }

  window.wsDiag = () => {
    const r = report();
    const json = JSON.stringify(r, null, 2);
    console.log(json);
    try {
      if (typeof copy === "function") {
        copy(json);
        console.log("[wsDiag] report copied to clipboard");
      }
    } catch {
      /* copy() only exists in the devtools console */
    }
    return r;
  };

  console.log("[wsDiag] put the video in fullscreen now; report in 6 s. Run wsDiag() for another.");
  setTimeout(window.wsDiag, 6000);
})();
