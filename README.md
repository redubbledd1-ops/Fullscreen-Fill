# Fullscreen Fill

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

### Mobiele drempels

`generic.mobile` overschrijft de drempels zodra de engine een mobiele viewport
ziet: `pointer: coarse`, of een viewport smaller dan `generic.mobileMaxViewportWidth`
(standaard 820px). Dat wordt per apply herbepaald, dus draaien van het toestel
schakelt vanzelf mee.

Nodig omdat de drempels viewport-relatief zijn: een 16:9-speler over de volle
breedte van een staande telefoon dekt maar ~0.26 van het scherm, onder de
desktopdrempel van 0.32. Alles wat in `generic` mag, mag ook in `generic.mobile`.

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

## Browsers en build

Eén codebase, twee manifesten. `manifest.json` is Chrome/Edge (MV3 service worker),
`manifest.firefox.json` is Gecko (MV3 event page + `browser_specific_settings`).

```bash
node tools/build.js            # dist/chrome en dist/firefox
node tools/build.js firefox    # alleen dat doel
python tools/pack.py           # zips voor de stores, manifest in de root
```

De build controleert dat beide manifesten dezelfde versie hebben en dat elk bestand
waar het manifest naar wijst ook echt in de map staat.

## Iconen

`store/icon-source.png` is het origineel. Alle maten komen daaruit:

```bash
python tools/make-icons.py     # icons/icon{16,32,48,128}.png + store/icon-{128,512}.png
```

De bron staat op zwart zonder alfakanaal; het script knipt de rand weg en zet er
een masker op, zodat de hoeken in een donkere werkbalk niet als blok opvallen.
Alleen `icons/` gaat mee in de build — `store/` blijft buiten de zip.

Alle extensie-API's lopen via `WsFillApi` uit [browser-api.js](browser-api.js):
Firefox' `browser.*` geeft promises, `chrome.*` daar geeft callbacks. Nieuwe code
gebruikt `WsFillApi`, nooit `chrome` of `browser` direct.

Firefox-ID is `fullscreen-fill@redubbledd1-ops.github.io`. Zonder ID werkt
`storage.sync` niet in Firefox, en na de eerste AMO-inzending ligt hij vast.

Status van de port: [PORTING-TODO.md](PORTING-TODO.md).

## Installeren

Chrome/Edge:

1. `chrome://extensions` → Developer mode  
2. Load unpacked op `dist/chrome` (of de projectmap zelf) / **Vernieuwen** na updates

Firefox:

1. `node tools/build.js firefox`  
2. `about:debugging#/runtime/this-firefox` → **Tijdelijke add-on laden** → `dist/firefox/manifest.json`

## Regressie

Na wijzigingen: zie [TEST-CHECKLIST.md](TEST-CHECKLIST.md) (10–20 representatieve cases).
