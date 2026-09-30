/*
 * Fullscreen Fill — on-device diagnostics (debug build only).
 *
 * Added to the content scripts by tools/build-debug.js; never part of a store
 * build. On YouTube it records what the page and the extension look like each
 * time the player goes fullscreen (or the window turns landscape), and puts a
 * small "FF debug" button on the page. Tap it after leaving fullscreen to see
 * the last report, screenshot it, or copy the full JSON.
 *
 * It only reads the page; the button and panel are the only things it adds.
 */
(() => {
  if (window !== window.top) return;
  if (!/(^|\.)youtube\.com$/i.test(location.hostname)) return;

  const MAX_SNAPSHOTS = 6;
  const snapshots = [];
  const TRAPS = [
    "transform",
    "perspective",
    "filter",
    "backdropFilter",
    "contain",
    "willChange",
    "containerType",
  ];

  let version = "?";
  try {
    version = WsFillApi.runtime.getManifest().version;
  } catch {
    /* no api */
  }

  // ------------------------------------------------------------- collecting

  function describe(el) {
    if (!el) return null;
    if (el === document.documentElement) return "html";
    let s = el.tagName.toLowerCase();
    if (el.id) s += "#" + el.id;
    const cls = typeof el.className === "string" ? el.className.trim() : "";
    if (cls) s += "." + cls.split(/\s+/).slice(0, 6).join(".");
    return s;
  }

  function box(el) {
    const r = el.getBoundingClientRect();
    return [r.left, r.top, r.width, r.height].map(Math.round).join(",");
  }

  function traps(el) {
    const cs = getComputedStyle(el);
    const out = {};
    for (const p of TRAPS) {
      const v = cs[p];
      if (v && v !== "none" && v !== "auto" && v !== "normal") out[p] = v;
    }
    return Object.keys(out).length ? out : null;
  }

  function videoInfo(v) {
    const cs = getComputedStyle(v);
    const attrs = {};
    for (const a of v.getAttributeNames()) {
      if (a.startsWith("data-ws")) attrs[a] = v.getAttribute(a);
    }
    const fs = document.fullscreenElement;
    const ancestors = [];
    for (let p = v.parentElement; p; p = p.parentElement) {
      const cps = getComputedStyle(p);
      const entry = { el: describe(p), box: box(p), position: cps.position };
      const t = traps(p);
      if (t) entry.traps = t;
      ancestors.push(entry);
      if (p === document.body) break;
    }
    return {
      el: describe(v),
      attrs,
      picture: `${v.videoWidth}x${v.videoHeight}`,
      box: box(v),
      paused: v.paused,
      isFullscreenEl: v === fs,
      insideFullscreenEl: Boolean(fs && fs !== v && fs.contains(v)),
      computed: {
        position: cs.position,
        inset: [cs.top, cs.right, cs.bottom, cs.left].join(" "),
        width: cs.width,
        height: cs.height,
        objectFit: cs.objectFit,
        transform: cs.transform,
        fitVar: cs.getPropertyValue("--ws-fill-fit").trim(),
      },
      inlineStyle: v.getAttribute("style") || "",
      ancestors,
    };
  }

  function wsClasses(el) {
    return el
      ? [...el.classList].filter(
          (c) => c.startsWith("ws-fill") || c === "yt-fill-active"
        )
      : [];
  }

  function capture(reason) {
    const html = document.documentElement;
    const fs =
      document.fullscreenElement || document.webkitFullscreenElement || null;
    const videos = [...document.querySelectorAll("video")];
    // Biggest on screen first: that is the one that matters.
    videos.sort((a, b) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      return rb.width * rb.height - ra.width * ra.height;
    });

    const snap = {
      reason,
      when: new Date().toISOString().slice(11, 19),
      version,
      url: location.pathname + location.search,
      ua: navigator.userAgent,
      viewport: `${innerWidth}x${innerHeight}@${devicePixelRatio}`,
      screen: `${screen.width}x${screen.height} ${screen.orientation?.type || ""}`,
      fullscreen: {
        element: describe(fs),
        isHtml: fs === html,
        isBody: fs === document.body,
        box: fs ? box(fs) : null,
      },
      htmlClasses: wsClasses(html),
      bodyClasses: wsClasses(document.body),
      overrideCss: Boolean(document.getElementById("ws-fill-override-style")),
      players: [...document.querySelectorAll(".html5-video-player")].map(
        (p) => ({
          el: describe(p),
          box: box(p),
          ytpFullscreen: p.classList.contains("ytp-fullscreen"),
        })
      ),
      videos: videos.slice(0, 3).map(videoInfo),
    };

    snapshots.push(snap);
    while (snapshots.length > MAX_SNAPSHOTS) snapshots.shift();
    updateBadge();
    return snap;
  }

  /** Fullscreen by the API, or a landscape window: either can be the bug. */
  function looksFullscreen() {
    return Boolean(document.fullscreenElement) || innerWidth > innerHeight;
  }

  function later(reason, ms) {
    setTimeout(() => {
      if (looksFullscreen()) capture(reason);
    }, ms);
  }

  document.addEventListener("fullscreenchange", () => {
    if (document.fullscreenElement) {
      later("fullscreen +1.5s", 1500);
      later("fullscreen +5s", 5000);
    }
  });

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (looksFullscreen()) capture("resize");
    }, 1500);
  });

  // ------------------------------------------------------------------ report

  function summary(s) {
    if (!s) return "Nog geen rapport. Zet een video fullscreen en kom terug.";
    const lines = [];
    lines.push(`FF debug v${s.version}  ${s.when}  (${s.reason})`);
    lines.push(`viewport ${s.viewport}  screen ${s.screen}`);
    lines.push(
      `fullscreenEl: ${s.fullscreen.element || "GEEN"}${
        s.fullscreen.isHtml ? "  [= <html>]" : ""
      }${s.fullscreen.isBody ? "  [= <body>]" : ""}`
    );
    if (s.fullscreen.box) lines.push(`  box ${s.fullscreen.box}`);
    lines.push(`html: ${s.htmlClasses.join(" ") || "-"}`);
    lines.push(`body: ${s.bodyClasses.join(" ") || "-"}`);
    lines.push(`override-css: ${s.overrideCss ? "ja" : "NEE"}`);
    for (const p of s.players) {
      lines.push(`player ${p.el}`);
      lines.push(`  box ${p.box}  ytp-fullscreen=${p.ytpFullscreen}`);
    }
    s.videos.forEach((v, i) => {
      const a = v.attrs;
      lines.push(`VIDEO ${i}: ${v.el}`);
      lines.push(
        `  fill=${a["data-ws-fill"] ?? "-"} fit=${a["data-ws-fit"] ?? "-"} portrait=${
          a["data-ws-portrait"] ?? "-"
        }  pic ${v.picture}`
      );
      lines.push(
        `  box ${v.box}  fsEl=${v.isFullscreenEl} inFs=${v.insideFullscreenEl}`
      );
      const c = v.computed;
      lines.push(
        `  css pos=${c.position} w=${c.width} h=${c.height} fit=${c.objectFit} var=${c.fitVar || "-"}`
      );
      lines.push(`  inset ${c.inset}`);
      if (c.transform !== "none") lines.push(`  transform ${c.transform}`);
      if (v.inlineStyle) lines.push(`  style="${v.inlineStyle}"`);
      if (i === 0) {
        v.ancestors.forEach((p, depth) => {
          const t = p.traps
            ? "  !! " +
              Object.entries(p.traps)
                .map(([k, val]) => `${k}:${val}`)
                .join(" ")
            : "";
          lines.push(`  ${"^".repeat(Math.min(depth + 1, 6))} ${p.el} [${p.position}] ${p.box}${t}`);
        });
      }
    });
    return lines.join("\n");
  }

  // ---------------------------------------------------------------------- UI

  const ui = document.createElement("div");
  ui.id = "ws-fill-debug";
  ui.style.cssText =
    "all:initial;position:fixed;left:8px;bottom:72px;z-index:2147483647;font:12px/1.35 monospace;";

  const badge = document.createElement("button");
  badge.type = "button";
  badge.style.cssText =
    "all:initial;background:#0a0a0a;color:#7CFC00;border:1px solid #7CFC00;border-radius:6px;padding:6px 9px;font:bold 12px monospace;cursor:pointer;opacity:.85;";

  const panel = document.createElement("div");
  panel.style.cssText =
    "all:initial;display:none;position:fixed;inset:8px;z-index:2147483647;background:#0a0a0a;color:#e6e6e6;border:1px solid #333;border-radius:8px;padding:8px;box-sizing:border-box;font:11px/1.35 monospace;flex-direction:column;gap:6px;";

  const bar = document.createElement("div");
  bar.style.cssText = "all:initial;display:flex;gap:6px;flex-wrap:wrap;";

  function button(label, onClick) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.style.cssText =
      "all:initial;background:#1c1c1c;color:#fff;border:1px solid #444;border-radius:5px;padding:7px 10px;font:12px monospace;cursor:pointer;";
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      onClick(b);
    });
    bar.appendChild(b);
    return b;
  }

  const text = document.createElement("pre");
  text.style.cssText =
    "all:initial;display:block;flex:1;overflow:auto;white-space:pre-wrap;word-break:break-all;color:#e6e6e6;font:12px/1.4 monospace;";

  let shown = -1;

  function render() {
    const s = shown >= 0 ? snapshots[shown] : null;
    const pos = snapshots.length ? `${shown + 1}/${snapshots.length}  ` : "";
    text.textContent = pos + summary(s);
  }

  button("Sluiten", () => {
    panel.style.display = "none";
  });
  button("◀", () => {
    if (shown > 0) shown -= 1;
    render();
  });
  button("▶", () => {
    if (shown < snapshots.length - 1) shown += 1;
    render();
  });
  button("Nu vastleggen", () => {
    capture("handmatig");
    shown = snapshots.length - 1;
    render();
  });
  button("Kopieer JSON", async (b) => {
    const json = JSON.stringify(snapshots, null, 1);
    let ok = false;
    try {
      await navigator.clipboard.writeText(json);
      ok = true;
    } catch {
      const area = document.createElement("textarea");
      area.value = json;
      area.style.cssText = "position:fixed;top:0;left:0;opacity:0;";
      document.documentElement.appendChild(area);
      area.select();
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      area.remove();
    }
    b.textContent = ok ? "Gekopieerd ✓" : "Kopiëren mislukt";
    setTimeout(() => (b.textContent = "Kopieer JSON"), 2000);
  });

  panel.append(bar, text);

  function updateBadge() {
    badge.textContent = `FF debug (${snapshots.length})`;
  }

  badge.addEventListener("click", (e) => {
    e.stopPropagation();
    shown = snapshots.length - 1;
    render();
    panel.style.display = "flex";
  });

  updateBadge();
  ui.append(badge, panel);

  function mount() {
    if (!ui.isConnected) document.documentElement.appendChild(ui);
  }
  mount();
  // YouTube rebuilds large parts of the page; put the button back if lost.
  setInterval(mount, 2000);
})();
