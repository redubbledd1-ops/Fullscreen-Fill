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

## Remote config

Popup → **URL check**: optionele remote `config.json`. Elke 6 uur + **Nu controleren**.

## Installeren

1. `chrome://extensions` → Developer mode  
2. Load unpacked / **Vernieuwen** na updates

## Regressie

Na wijzigingen: zie [TEST-CHECKLIST.md](TEST-CHECKLIST.md) (10–20 representatieve cases).
