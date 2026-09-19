# Widescreen Fill

Chrome/Edge-extensie die **landscape**-video's breed uitrekt (volledig beeld zichtbaar, geen zoom/crop). Verticale video's blijven normaal.

## Aanpak

Eén generieke engine + remote overrides. Geen site-specifieke content scripts.

1. **Grote on-page players** (≈ ≥32% van het scherm)
2. **Browser fullscreen** — Fullscreen API
3. **Pseudo-fullscreen** — player ≈ ≥92% viewport
4. **Hinted fullscreen** — config (`fullscreenHint`), bijv. YouTube `ytp-fullscreen`
5. **Player-root fill** + structurele letterbox-adapters
6. **Embed-iframes** — player-formaat + optionele host-allowlist
7. **Remote overrides** — CSS + hints als data

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

| Veld | Betekenis |
|------|-----------|
| `match` | host, `host/path`, `re:regex`, of array daarvan |
| `css` | geïnjecteerde polish-CSS |
| `fullscreenOnly` | alleen stretchen in (hinted) fullscreen |
| `fullscreenHint` | CSS-class op player = fullscreen |
| `activeClass` | body/html-class terwijl stretch aan staat |
| `events` | extra DOM-events die opnieuw apply’en |

Nieuwe hardnekkige site = config-update, geen store-release.

## URL blacklist

In de popup: één domein of URL per regel. Matches krijgen **nooit** breedbeeld.

## Spelertype-filter

Naast de URL-blacklist kan per **spelertype** worden uitgezet (popup →
**Spelertypes**). Handig als een type op een bepaald apparaat of in een bepaalde
browser problemen geeft, of gewoon niet gewenst is.

| Type | Wat | Voorbeeld |
|------|-----|-----------|
| `native` | directe bron (mp4 e.d.), ook onbekende bronnen | nieuws-site, lokale HTML5 |
| `mse` | MediaSource / `blob:`-bron | YouTube, meeste streaming |
| `drm` | EME/beveiligd (`mediaKeys` of `encrypted`-event) | Netflix, Prime |
| `embed` | speler in een iframe (in het frame én de parent-verbreding) | embedsports, viduki |

Eén type per video, in deze volgorde: `drm` → `embed` → `mse` → `native`. Een
uitgevinkt type krijgt nooit breedbeeld, op geen enkele site. De popup toont ook
welk type de huidige tab draait en waarom breedbeeld wel/niet actief is.

Opslag: `chrome.storage.sync` sleutel `playerTypes` (`{ native, mse, drm, embed }`,
alles wat niet expliciet `false` is staat aan).

## Taal

De popup kiest zijn taal **automatisch** uit de browsertaal
(`chrome.i18n.getUILanguage()`). Met het uitklapmenu bovenin is dat te
overrulen; de keuze staat in `chrome.storage.sync` onder `uiLang`
(`auto` | `en` | `nl` | `de` | `fr` | `es`) en geldt dus op al je apparaten.

Alle popup-teksten staan in [i18n.js](i18n.js) (`WsFillI18n.MESSAGES`). Statische
markup wordt vertaald via `data-i18n`, `data-i18n-placeholder` en
`data-i18n-title`; dynamische teksten via `WsFillI18n.t(key, vars, locale)`.

Nieuwe taal toevoegen: één blok in `MESSAGES` + een naam in `LOCALE_NAMES`. De
sleutelset moet gelijk zijn aan `en` (die is de fallback bij een ontbrekende
sleutel).

`_locales/` bevat alleen de store-naam en -omschrijving (`__MSG_extName__` /
`__MSG_extDesc__` in het manifest) — dat is wat Chrome zelf vertaalt en kan niet
tijdens runtime worden gewisseld.

## Remote config

Popup → **URL check**: optionele remote `config.json`. Elke 6 uur + **Nu controleren**.

## Installeren

1. `chrome://extensions` → Developer mode  
2. Load unpacked / **Vernieuwen** na updates

## Regressie

Na wijzigingen: zie [TEST-CHECKLIST.md](TEST-CHECKLIST.md) (10–20 representatieve cases).
