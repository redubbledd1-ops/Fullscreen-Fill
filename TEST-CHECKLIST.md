# Regressie-meetset — Widescreen Fill

Checklist na code-/config-wijzigingen. Extensie herladen → per rij: **Pass** / **Fail** / **Skip** + korte notitie.

**Versie getest:** ______  
**Browser:** Chrome / Edge ______  
**Datum:** ______

---

## Hoe te scoren

| Score | Betekenis |
|-------|-----------|
| Pass | Gedrag zoals verwacht |
| Fail | Verkeerd of regressie |
| Skip | Geen account / geo / site down |

**Portrait-regel:** verticale video’s mogen **nooit** breed uitrekken (`object-fit: contain` / geen fill).  
**Preview-regel:** kleine thumbnails / home-feeds mogen **niet** meegaan.

---

## A. Native / grote on-page `<video>`

| # | Site / scenario | Type | Verwacht | Score | Notitie |
|---|-----------------|------|----------|-------|---------|
| 1 | Willekeurige movie/stream-site met grote player (geen YouTube) | Native / MSE | Landscape vult speelvlak; controls bruikbaar | | |
| 2 | Zelfde site, **kleine** preview op home/search | Native | Geen stretch | | |
| 3 | Site met **portrait**/Shorts-achtige clip in grote player | Native | Geen breed-fill | | |

Voorbeelden om te proberen: Vimeo watch, Dailymotion, lokale HTML5-demo, nieuws-sites met embedded player.

---

## B. MSE (Media Source Extensions)

| # | Site / scenario | Type | Verwacht | Score | Notitie |
|---|-----------------|------|----------|-------|---------|
| 4 | **YouTube** watch — normaal (niet fullscreen) | MSE | **Geen** stretch (`fullscreenOnly`) | | |
| 5 | **YouTube** — browser of player fullscreen, landscape | MSE + hinted FS | Breed fill; `yt-fill-active` aan | | |
| 6 | **YouTube** Shorts / portrait in fullscreen | MSE + hinted FS | Geen breed-fill | | |
| 7 | **YouTube** — wissel video (SPA-nav) daarna opnieuw FS | MSE + events | Fill blijft correct na navigatie | | |

---

## C. DRM / protected players

| # | Site / scenario | Type | Verwacht | Score | Notitie |
|---|-----------------|------|----------|-------|---------|
| 8 | **Netflix** `/watch/…` landscape | DRM + override CSS | Breed fill; playback/DRM intact | | Skip ok zonder abo |
| 9 | Netflix (of vergelijkbaar) UI: controls / FS-knop | DRM | Player-chrome niet kapot | | |

Alternatief DRM als Netflix niet kan: Disney+/Prime/other — noteer welke.

---

## D. Iframe-embeds

| # | Site / scenario | Type | Verwacht | Score | Notitie |
|---|-----------------|------|----------|-------|---------|
| 10 | Stream-host pagina met **grote** embed (≥ ~480×270) | Iframe embed | Stretch in frame en/of parent verbreedt primary iframe | | |
| 11 | **TvSportsLive** (of vergelijkbaar) + embedsports/viduki | Iframe + override | Embed breed; theater werkt | | |
| 12 | Kleine widget-embed (tweet/video card, smalle iframe) | Iframe | **Geen** agressieve stretch | | |

---

## E. Pseudo-fullscreen / theater

| # | Site / scenario | Type | Verwacht | Score | Notitie |
|---|-----------------|------|----------|-------|---------|
| 13 | YouTube `ytp-fullscreen` (hinted, niet per se Fullscreen API) | Pseudo / hint | Fill zoals B5 | | |
| 14 | Site met theater-mode (player ≈ vol scherm, chat/sidebar) | Pseudo / theater | Video vult speelvlak; layout niet totaal kapot | | |
| 15 | **TvSportsLive** theater-clean-view | Theater + override | Player full-bleed; chat verborgen via override | | |

---

## F. Browser Fullscreen API

| # | Site / scenario | Type | Verwacht | Score | Notitie |
|---|-----------------|------|----------|-------|---------|
| 16 | Willekeurige site → echte F11 / element-fullscreen, landscape | Fullscreen API | `ws-fill-fs` + fill | | |
| 17 | Verlaat fullscreen | Fullscreen API | Stretch uit (tenzij page-mode nog geldt) | | |

---

## G. Extensie-gedrag (niet site-specifiek)

| # | Scenario | Verwacht | Score | Notitie |
|---|----------|----------|-------|---------|
| 18 | Popup: Breedbeeld **uit** | Overal geen stretch | | |
| 19 | Blacklist: huidig **domain** | Die site nooit stretch | | |
| 20 | Blacklist: één YouTube **video** (`ytid:`) | Alleen die video geblokt; andere YT ok | | |
| 21 | Remote config “Nu controleren” (of bundled) | Geen errors; config-versie zichtbaar | | |
| 22 | Extensie-pagina errors | Geen `Unchecked runtime.lastError` | | |

---

## Snelle smoke (5 min)

Minimaal vóór een release:

1. YouTube FS landscape → Pass  
2. YouTube niet-FS → geen stretch  
3. Eén iframe-embed site → Pass  
4. Eén non-YouTube grote player → Pass  
5. Portrait ergens → geen fill  
6. Toggle uit + blacklist → werkt  

---

## Logboek

| Datum | Versie | Pass/Fail/Skip | Belangrijkste findings |
|-------|--------|----------------|------------------------|
| | 1.11.0 | | |
| | | | |

---

## Sites om later aan de meetset toe te voegen

Noteer hier hosts die Fail gaven of structureel anders zijn — kandidaat voor een **remote override** i.p.v. nieuwe JS:

| Host | Probleem | Override-idee |
|------|----------|---------------|
| | | |
