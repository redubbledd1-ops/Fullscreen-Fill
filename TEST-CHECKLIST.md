# Regressie-meetset — Fullscreen Fill

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
**Eigendom-regel:** de extensie schrijft geen inline styles meer. Het speelveld moet buiten fullscreen **exact even groot** blijven als met de extensie uit - verspringende breedte of een leeg grijs speelvlak = regressie.  
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
| 10 | Stream-host pagina met **grote** embed (≥ ~480×270) | Iframe embed | Stretch in het frame zelf (de parent-pagina wordt niet meer aangepast) | | |
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
| 18 | Popup: schuifknop naast de titel **uit** | Overal geen stretch; knop grijs, bolletje links | | |
| 19 | Blacklist: huidig **domain** | Die site nooit stretch | | |
| 20 | Blacklist: één YouTube **video** (`ytid:`) | Alleen die video geblokt; andere YT ok | | |
| 21 | Remote config “Nu controleren” (of bundled) | Geen errors; config-versie zichtbaar | | |
| 22 | Extensie-pagina errors | Geen `Unchecked runtime.lastError` | | |
| 23 | Popup toont spelertype van huidige tab | YouTube = MSE, Netflix = DRM, embed-site = Iframe-embed | | |
| 24 | Spelertype **MSE** uit -> YouTube fullscreen | Geen stretch; native/embed-sites wel | | |
| 25 | Spelertype **embed** uit | Geen frame-stretch | | |
| 26 | Spelertype weer aan | Stretch komt terug zonder tab-reload | | |
| 27 | Popup met browsertaal NL / EN / DE | Teksten in die taal; "Automatisch" toont de gedetecteerde taal | | |
| 28 | Taal handmatig wisselen in de dropdown | Alles hertaalt direct, ook lijsten, badges en statusregel | | |
| 29 | Taal na popup opnieuw openen | Keuze onthouden (sync) | | |
| 30 | Browsertaal zonder vertaling (bijv. pl) | Valt terug op Engels, geen lege knoppen | | |
| 41 | Verse installatie, popup openen | Modus staat op **Zoomen** | | |
| 42 | Modus **Zoomen**, 21:9-film of 4:3-clip in fullscreen | Scherm vol, niets vervormd; randen vallen weg | | |
| 43 | Modus **Uitrekken**, zelfde video | Scherm vol, hele beeld zichtbaar maar uitgerekt | | |
| 44 | Modus wisselen tijdens het kijken (ook YouTube fullscreen) | Wisselt direct, zonder tab-reload | | |
| 45 | Portrait-clip in beide modi | Nooit gezoomd of uitgerekt | | |
| 46 | Popup: Modus **Zoomen** | "Uitrekken tot" / "Daarboven" verborgen | | |
| 47 | Uitrekken, grens **Geen grens** | "Daarboven" grijs; alles wordt uitgerekt zoals vóór 1.21 | | |
| 48 | Uitrekken tot **25%**, daarboven **Balken**, 4:3-clip op 16:9-scherm (33%) | Balken blijven; popup: "balken (33% verschil)" | | |
| 49 | Zelfde, daarboven **Zoomen** | Gezoomd; popup: "gezoomd (33% verschil)" | | |
| 50 | Zelfde, grens **33%** | Uitgerekt (33% valt binnen de grens) | | |
| 51 | Uitrekken tot 25%, 16:9 in fullscreen op 20:9-telefoon (25%) | Uitgerekt | | |
| 52 | Uitrekken tot **Geen grens** | Rij "Daarboven" niet zichtbaar; verschijnt zodra je een grens kiest | | |
| 53 | Vullen vanaf **5:4 en breder**, vierkante YouTube-video in fullscreen | Normaal beeld, extensie doet niets; popup: "deze videovorm blijft normaal" | | |
| 54 | Zelfde met **Elke liggende video** | Vierkant wordt weer gezoomd/uitgerekt | | |
| 55 | Telefoon: Add-ons → Fullscreen Fill → **Instellingen** | Opent instellingen: alle secties open, geen "huidige tab"/"Blokkeer huidige pagina" | | |
| 56 | Chrome: `chrome://extensions` → Details → **Extensie-opties** | Zelfde instellingenpagina in een tab | | |
| 57 | Instelling wijzigen op de instellingenpagina, popup openen | Popup toont dezelfde waarde | | |
| 58 | Popup op telefoon | Tekst goed leesbaar zonder inzoomen (≈17px), geen zijwaarts scrollen | | |
| 59 | Popup → **Probleem melden** | Instellingen openen bij het meldformulier; cursor in "Wat ging er mis?" | | |
| 60 | Leeg formulier | Beide verzendknoppen grijs | | |
| 61 | **Technische gegevens** aanvinken (Firefox) | Firefox vraagt zelf toestemming; bij Nee gaat het vinkje weer uit | | |
| 62 | **Site meesturen** | Alleen het domein (bijv. `youtube.com`) in de voorbeeldtekst, nooit de volledige URL | | |
| 63 | **Melden via GitHub** | Nieuw tabblad met ingevuld issue; zonder account eerst inloggen, daarna nog steeds ingevuld | | |
| 64 | **Mailen** (ook op telefoon) | Mail-app opent met onderwerp en tekst aan fullscreenfill@gmail.com | | |
| 65 | Instellingen direct openen (zonder popup) | Geen "Site meesturen"; melden werkt wel | | |

---

## H. Mobiel (Firefox Android)

| # | Scenario | Verwacht | Score | Notitie |
|---|----------|----------|-------|---------|
| 31 | Telefoon **portret**, grote on-page speler | Breedbeeld (mobiele drempels actief) | | |
| 32 | Telefoon **landschap** / fullscreen | Breedbeeld, controls bruikbaar | | |
| 33 | Toestel draaien tijdens afspelen | Schakelt mee zonder herladen | | |
| 34 | Portrait-clip op mobiel | Geen breed-fill | | |
| 35 | Kleine preview in feed op mobiel | Geen stretch | | |
| 36 | Popup op telefoon | Vinkjes/knoppen met vinger te raken, geen horizontale scroll | | |
| 37 | Tab naar achtergrond, later terug | Geen werk in de achtergrond; bij terugkeer meteen correct | | |
| 38 | Accu/CPU tijdens 10 min video | Geen merkbare extra belasting | | |
| 39 | YouTube (m.youtube.com) → fullscreen, 10 s kijken **zonder** aan te raken | Beeld staat stil in fill: geen knipperen, geen zwarte flitsen | | |
| 40 | Andere site met eigen speler → fullscreen op telefoon, idem | Idem 39; bediening blijft te raken | | |

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
