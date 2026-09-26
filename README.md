# Fullscreen Fill

Chrome/Edge extension that makes **landscape** video fill the screen. Portrait video is left unchanged.

Two modes, picked in the popup:

- **Zoom** (default for now) — the picture is enlarged until the screen is covered; the edges are cropped, nothing is distorted
- **Stretch** — the whole picture stays visible and is stretched to the screen

## Download

**Chrome / Edge** (until the Chrome Web Store listing is approved):

1. Download the ZIP: [Fullscreen Fill (main branch)](https://github.com/redubbledd1-ops/Fullscreen-Fill/archive/refs/heads/main.zip)
2. Extract it somewhere permanent — don't delete the folder afterwards, Chrome loads the extension straight from it
3. Open `chrome://extensions` (or `edge://extensions`) and turn on **Developer mode** (top right)
4. Click **Load unpacked** and select the extracted `Fullscreen-Fill-main` folder
5. Done — the icon appears in the toolbar

Once the Chrome Web Store listing goes live, this section will just be a store link instead.

**Firefox** — coming soon on addons.mozilla.org

## Approach

One generic engine + remote overrides. No site-specific content scripts.

1. **Large on-page players** (≈ ≥32% of the screen) — the picture is stretched
   to the box the player chose; the element's own size is never changed
2. **Browser fullscreen** — the `:fullscreen` CSS pseudo-class, no scripting
3. **Hinted fullscreen** — config (`fullscreenHint`), e.g. YouTube's `ytp-fullscreen`
4. **Embedded iframes** — the content script runs in the frame, so a player
   inside one is handled exactly like a top-level player
5. **Remote overrides** — CSS + hints as data, for players that letterbox by
   sizing the `<video>` element itself (YouTube, Netflix)

## Remote overrides

```json
"overrides": [
  {
    "id": "youtube",
    "match": ["youtube.com", "youtu.be"],
    "css": "...",
    "activeClass": "yt-fill-active",
    "fullscreenOnly": true,
    "fullscreenHint": {
      "selector": ".html5-video-player",
      "class": "ytp-fullscreen"
    },
    "events": ["yt-navigate-finish", "yt-page-data-updated"]
  },
  { "id": "netflix", "match": "netflix.com", "css": "..." }
]
```

| Field | Meaning |
|-------|---------|
| `match` | host, `host/path`, `re:regex`, or an array of these |
| `css` | injected polish CSS — write `object-fit:var(--ws-fill-fit,fill)`, never a fixed value, so the mode setting still applies |
| `fullscreenOnly` | only stretch in (hinted) fullscreen |
| `fullscreenHint` | CSS class on the player = fullscreen |
| `activeClass` | body/html class while stretch is active |
| `events` | extra DOM events that re-trigger apply |

### Mobile thresholds

`generic.mobile` overrides the thresholds as soon as the engine detects a mobile
viewport: `pointer: coarse`, or a viewport narrower than `generic.mobileMaxViewportWidth`
(default 820px). This is re-evaluated on every apply, so rotating the device
switches automatically.

Needed because the thresholds are viewport-relative: a 16:9 player spanning the
full width of a phone in portrait only covers ~0.26 of the screen, below the
desktop threshold of 0.32. Anything allowed in `generic` is also allowed in
`generic.mobile`.

A new stubborn site = a config update, not a store release.

## URL blacklist

In the popup: one domain or URL per line. Matches **never** get widescreen.

## Player-type filter

Besides the URL blacklist, you can turn off individual **player types** (popup →
**Player types**). Useful when a type causes problems on a certain device or
browser, or is simply not wanted.

| Type | What | Example |
|------|------|---------|
| `native` | direct source (mp4 etc.), including unknown sources | news site, local HTML5 |
| `mse` | MediaSource / `blob:` source | YouTube, most streaming |
| `drm` | EME/protected (`mediaKeys` or `encrypted` event) | Netflix, Prime |
| `embed` | player inside an iframe (both the frame and the parent widening) | embedsports, viduki |

One type per video, in this order: `drm` → `embed` → `mse` → `native`. An
unchecked type never gets widescreen, on any site. The popup also shows which
type the current tab is running and why widescreen is or isn't active.

Storage: `chrome.storage.sync` key `playerTypes` (`{ native, mse, drm, embed }`,
anything not explicitly `false` is on).

## Language

The popup automatically picks its language from the browser language
(`chrome.i18n.getUILanguage()`). The dropdown at the top can override that; the
choice is stored in `chrome.storage.sync` under `uiLang`
(`auto` | `en` | `nl` | `de` | `fr` | `es`), so it applies across all your
devices.

All popup text lives in [i18n.js](i18n.js) (`WsFillI18n.MESSAGES`). Static
markup is translated via `data-i18n`, `data-i18n-placeholder` and
`data-i18n-title`; dynamic text via `WsFillI18n.t(key, vars, locale)`.

Adding a new language: one block in `MESSAGES` + a name in `LOCALE_NAMES`. The
key set must match `en` (which is the fallback for a missing key).

`_locales/` only holds the store name and description (`__MSG_extName__` /
`__MSG_extDesc__` in the manifest) — that's what Chrome translates itself and
can't be swapped at runtime.

## Remote config

Popup → **URL check**: optional remote `config.json`. Every 6 hours + a manual
**Check now**.

## Browsers and build

One codebase, two manifests. `manifest.json` is for Chrome/Edge (MV3 service
worker), `manifest.firefox.json` is for Gecko (MV3 event page +
`browser_specific_settings`).

```bash
node tools/build.js            # dist/chrome and dist/firefox
node tools/build.js firefox    # that target only
python tools/pack.py           # zips for the stores, manifest at the root
```

The build checks that both manifests have the same version and that every file
the manifest points to actually exists in the folder.

## Icons

`store/icon-source.png` is the original. All sizes are derived from it:

```bash
python tools/make-icons.py     # icons/icon{16,32,48,128}.png + store/icon-{128,512}.png
```

The source sits on black with no alpha channel; the script trims the edge and
applies a mask so the corners don't stand out as a block in a dark toolbar.
Only `icons/` ships in the build — `store/` stays out of the zip.

All extension APIs go through `WsFillApi` from [browser-api.js](browser-api.js):
Firefox's `browser.*` returns promises, its `chrome.*` uses callbacks. New code
uses `WsFillApi`, never `chrome` or `browser` directly.

The Firefox ID is `fullscreen-fill@redubbledd1-ops.github.io`. Without an ID,
`storage.sync` doesn't work in Firefox, and it's locked in after the first AMO
submission.

Port status: [PORTING-TODO.md](PORTING-TODO.md).

## Local development install

Chrome/Edge:

1. `chrome://extensions` → Developer mode
2. Load unpacked on `dist/chrome` (or the project folder itself) / **Refresh** after updates

Firefox:

1. `node tools/build.js firefox`
2. `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on** → `dist/firefox/manifest.json`

## Regression

After changes: see [TEST-CHECKLIST.md](TEST-CHECKLIST.md) (10–20 representative cases).
