# Porting-TODO — Firefox + mobiel

Doel: één codebase, drie doelen (Chrome/Edge, Firefox desktop, Firefox Android).
Afvinken per regel; datum + bevinding erachter.

---

## Fase 1 — Firefox desktop

| # | Taak | Status | Notitie |
|---|------|--------|---------|
| 1.1 | API-shim: `browser` (promises) vs `chrome` (callbacks) achter één `WsFillApi` | ✅ | `browser-api.js`, als eerste geladen |
| 1.2 | Alle `chrome.*` aanroepen omzetten in popup, background, config-client, content script, i18n | ✅ | |
| 1.3 | Firefox-manifest (MV3) met `background.scripts` i.p.v. `service_worker` | ✅ | `manifest.firefox.json` |
| 1.4 | `browser_specific_settings.gecko.id` + `strict_min_version` (nodig voor `storage.sync`) | ✅ | id nog vervangen door eigen domein |
| 1.5 | Buildscript dat `dist/chrome` en `dist/firefox` vult | ✅ | `node tools/build.js` |
| 1.6 | Laden via `about:debugging` → tijdelijke add-on, smoke-test | ⬜ | |
| 1.7 | Checklist A–G draaien in Firefox desktop | ⬜ | verschillen noteren |
| 1.8 | Host-permissies MV3: controleren of "Toestaan op alle sites" nodig is bij installatie | ⬜ | Firefox vraagt dit bij installatie |
| 1.9 | Fullscreen-detectie in Gecko: `mozFullScreenElement` verouderd, `fullscreenElement` zou moeten volstaan | ✅ | `fullscreenElement` wordt eerst gelezen; de oude varianten zijn onschadelijke fallbacks |

## Fase 2 — Firefox Android

| # | Taak | Status | Notitie |
|---|------|--------|---------|
| 2.1 | `gecko_android.strict_min_version` in Firefox-manifest | ✅ | |
| 2.2 | Mobiele drempels: portret-viewport haalt `mainVideoMinAreaRatio` (0.32) niet — 16:9 op volle breedte ≈ 0.26 | ✅ | `generic.mobile` zet hem op 0.14 |
| 2.3 | `generic.mobile`-blok in config + oriëntatie-/pointer-detectie in de engine | ✅ | `isMobileViewport()` + `refreshTuning()` per apply |
| 2.4 | Popup op smal scherm: panelen, dropdown, knoppen bruikbaar met vinger | ✅ | media query op `max-width: 480px` / `pointer: coarse` |
| 2.5 | Testen op toestel: `web-ext run -t firefox-android` of `about:debugging` via USB | ⬜ | |
| 2.6 | Checklist draaien op mobiel; mobiel-specifieke rijen toevoegen | 🟡 | bevinding: knoppen in YouTube-fullscreen reageerden niet — zie onder |
| 2.7 | Accu/CPU: MutationObserver + 1s-interval meten op telefoon | 🟡 | verborgen tab doet nu niets meer; meten moet nog |

## Fase 3 — Publiceren

| # | Taak | Status | Notitie |
|---|------|--------|---------|
| 3.1 | AMO-inzending, Android-compatibiliteit aanvinken | ⬜ | eerst gecko-ID vervangen |
| 3.2 | Store-teksten `_locales/*/messages.json` opwaarderen (nu functioneel, geen marketing) | ✅ | lange teksten in [STORE-LISTING.md](STORE-LISTING.md) |
| 3.3 | Privacyverklaring: extensie stuurt niets weg behalve optionele remote config-URL | ✅ | [PRIVACY.md](PRIVACY.md), moet nog op een publieke URL |
| 3.4 | Screenshots per store (desktop + mobiel) | ⬜ | store-iconen staan er al: `store/icon-{128,512}.png` |
| 3.5 | Chrome Web Store-inzending | 🟡 | zip klaar via `python tools/pack.py`; screenshots + privacy-URL ontbreken |
| 3.6 | Eigen icoon op alle maten (16/32/48/128) | ✅ | `python tools/make-icons.py` uit `store/icon-source.png` |

---

## Drempels (2.2 / 2.3)

`isMainPlayerVideo()` rekent viewport-relatief. Op een telefoon in portret haalt een
16:9-speler over de volle breedte:

- oppervlakratio ≈ `1.0 × 0.5625 × (vw/vh)` ≈ **0.26** bij een 9:19.5-scherm → onder `mainVideoMinAreaRatio: 0.32`
- hoogteratio ≈ **0.26** → onder `mainVideoMinHeightRatio: 0.32`

Gevolg: on-page breedbeeld deed niets op een staande telefoon. Fullscreen (liggend)
werkte wel, want dat loopt via de fullscreen-tak.

Opgelost met `generic.mobile` in de config. De engine schakelt om zodra
`pointer: coarse` geldt of de viewport ≤ `mobileMaxViewportWidth` (820px) is, en
herberekent dat bij elke apply — dus ook bij draaien van het toestel.

Met de nieuwe waarden haalt dezelfde speler 0.2535 ≥ `0.14`: wel breedbeeld.
De getallen zijn een eerste gok; afstellen gebeurt op een echt toestel (2.5/2.6).

---

## Bevinding: knoppen reageren niet in fullscreen (mobiel)

Firefox Android, YouTube in fullscreen: instellingenknop en andere knoppen
reageerden niet meer met de extensie aan.

Verdachte: deep fill pinde `video.parentElement` als `position:absolute; inset:0`.
Zit de spelerbediening in dezelfde wrapper (of komt die wrapper later in de DOM),
dan ligt er een transparante laag over de knoppen die alle taps opvangt.

Aangepast in 1.17.0:

1. Een wrapper met bedieningselementen (`button`, `a[href]`, `[role=button]`,
   `[tabindex]`, …) wordt nooit meer gepind.
2. Een wrapper die we tóch pinnen krijgt `pointer-events: none`; de `<video>`
   krijgt `pointer-events: auto` terug.
3. Nieuwe knop `deepFillContainer` — op mobiel standaard `false`, dus daar wordt
   alleen de `<video>` zelf gevuld.

Bevestigen: helpt dit niet, dan ligt het niet aan de wrapper maar aan de
override-CSS of aan het `<video>`-element zelf, en is de volgende stap
`deepFill` op mobiel helemaal uitzetten.

---

## Buildcommando

```bash
node tools/build.js
```

`dist/chrome` en `dist/firefox` bevatten daarna elk een complete, laadbare extensie.
