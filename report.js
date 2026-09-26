/**
 * Bug reports: written by the user, sent by the user.
 *
 * Nothing here talks to a server. The settings page shows the report in full,
 * and the user sends it themselves — as a prefilled GitHub issue (public) or a
 * prefilled email in their own mail app (private). Technical details and the
 * site are only in it when the user ticked them, and on Firefox only after the
 * browser's own data-collection prompt said yes.
 */
const WsFillReport = (() => {
  const REPO = "redubbledd1-ops/Fullscreen-Fill";
  const EMAIL = "fullscreenfill@gmail.com";
  const MAX_TEXT = 2000;

  /** Firefox's data-collection categories, as declared in manifest.firefox.json. */
  const CONSENT = {
    tech: "technicalAndInteraction",
    site: "browsingActivity",
  };

  function title(text) {
    const first = String(text || "").trim().split(/\r?\n/)[0].trim();
    const short = first.length > 70 ? `${first.slice(0, 69)}…` : first;
    return `Bug: ${short || "no description"}`;
  }

  /**
   * parts: { text, device, host, tech } — host and tech only when ticked.
   * tech: { version, browser, os, screen, settings, page }.
   * English labels: whoever reads the tracker reads it in one language.
   */
  function body(parts) {
    const text = String(parts.text || "").trim().slice(0, MAX_TEXT);
    const lines = ["**What went wrong**", text || "—", ""];
    lines.push(`**Device:** ${String(parts.device || "").trim() || "—"}`);
    if (parts.host) lines.push(`**Site:** ${parts.host}`);

    const tech = parts.tech;
    if (tech) {
      lines.push("", "**Technical details**");
      lines.push(`- Extension: ${tech.version}`);
      lines.push(`- Browser: ${tech.browser}${tech.os ? ` (${tech.os})` : ""}`);
      lines.push(`- Screen: ${tech.screen}`);
      lines.push(`- Settings: ${tech.settings}`);
      if (tech.page) lines.push(`- On the page: ${tech.page}`);
    }
    return lines.join("\n");
  }

  function githubUrl(parts) {
    const query = new URLSearchParams({
      title: title(parts.text),
      body: body(parts),
      labels: "bug",
    });
    return `https://github.com/${REPO}/issues/new?${query}`;
  }

  /** mailto wants %20 rather than + and CRLF line breaks (RFC 6068). */
  function mailUrl(parts) {
    const subject = encodeURIComponent(`[Fullscreen Fill] ${title(parts.text)}`);
    const text = encodeURIComponent(body(parts).replace(/\n/g, "\r\n"));
    return `mailto:${EMAIL}?subject=${subject}&body=${text}`;
  }

  /** The user's own settings, in one line. Blacklist entries are browsing data: only the count. */
  function describeSettings({ enabled, fill, playerTypes, blacklistCount }) {
    const off = Object.keys(playerTypes || {}).filter((type) => playerTypes[type] === false);
    const parts = [
      enabled ? "on" : "off",
      `mode ${fill.fillMode}`,
      `fill from ${fill.minAspect}`,
    ];
    if (fill.fillMode === "stretch") {
      parts.push(fill.stretchLimit ? `limit ${fill.stretchLimit}%` : "no limit");
      if (fill.stretchLimit) parts.push(`beyond ${fill.overLimit}`);
    }
    parts.push(`player types off: ${off.length ? off.join(", ") : "none"}`);
    parts.push(`blacklist entries: ${blacklistCount || 0}`);
    return parts.join(" · ");
  }

  /** What the content script reported for the tab the report started from. */
  function describePage(state) {
    if (!state) return "";
    if (!state.type) return "no player found";
    const fits = { fill: "stretched", cover: "zoomed", contain: "bars kept" };
    const parts = [state.type, state.active ? "active" : "not active"];
    if (state.fit) parts.push(fits[state.fit] || state.fit);
    if (state.aspectDiff) parts.push(`${state.aspectDiff}% difference`);
    if (state.shapeOff) parts.push("shape left alone");
    if (state.blacklisted) parts.push("blacklisted");
    if (!state.typeAllowed) parts.push("player type off");
    if (state.fullscreenOnly) parts.push("fullscreen-only site");
    if (state.fullscreen) parts.push("in fullscreen");
    return parts.join(" · ");
  }

  /** Browser, OS and screen. The device model is not something a browser tells extensions. */
  async function environment() {
    const out = {
      version: WsFillApi.runtime.getManifest().version,
      browser: "",
      os: "",
      screen: `${screen.width}×${screen.height} @${window.devicePixelRatio || 1}x`,
    };
    try {
      const info = await WsFillApi.runtime.getBrowserInfo?.();
      if (info) out.browser = `${info.name} ${info.version}`;
    } catch {
      /* not Firefox */
    }
    if (!out.browser) {
      const ua = navigator.userAgent;
      const edge = ua.match(/Edg\/([\d.]+)/);
      const chrome = ua.match(/Chrome\/([\d.]+)/);
      out.browser = edge ? `Edge ${edge[1]}` : chrome ? `Chrome ${chrome[1]}` : ua;
    }
    try {
      out.os = (await WsFillApi.runtime.getPlatformInfo()).os;
    } catch {
      /* unknown */
    }
    return out;
  }

  /**
   * Firefox asks for data-collection consent itself, and only while it is
   * handling the user's click — so this must be the first thing the click
   * handler does, before any await. Chrome has no such prompt: there the
   * ticked box is the consent. Anything that goes wrong counts as a no.
   */
  function askConsent(kind) {
    if (typeof WsFillApi.runtime.getBrowserInfo !== "function") {
      return Promise.resolve(true);
    }
    try {
      return WsFillApi.permissions
        .request({ data_collection: [CONSENT[kind]] })
        .then(Boolean, () => false);
    } catch {
      return Promise.resolve(false);
    }
  }

  return {
    EMAIL,
    MAX_TEXT,
    title,
    body,
    githubUrl,
    mailUrl,
    describeSettings,
    describePage,
    environment,
    askConsent,
  };
})();
