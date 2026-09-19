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
| 1.8 | Host-permissies MV3: controleren of "Toestaan op alle sites" nodig is bij installatie | ⬜ | Firefox ≥127 vraagt dit bij installatie |
| 1.9 | Fullscreen-detectie in Gecko: `mozFullScreenElement` verouderd, `fullscreenElement` zou moeten volstaan | ⬜ | |

## Fase 2 — Firefox Android

| # | Taak | Status | Notitie |
|---|------|--------|---------|
| 2.1 | `gecko_android.strict_min_version` in Firefox-manifest | ✅ | |
| 2.2 | Mobiele drempels: portret-viewport haalt `mainVideoMinAreaRatio` (0.32) niet — 16:9 op volle breedte ≈ 0.26 | ✅ | `generic.mobile` zet hem op 0.14 |
| 2.3 | `generic.mobile`-blok in config + oriëntatie-/pointer-detectie in de engine | ✅ | `isMobileViewport()` + `refreshTuning()` per apply |
| 2.4 | Popup op smal scherm: panelen, dropdown, knoppen bruikbaar met vinger | ✅ | media query op `max-width: 480px` / `pointer: coarse` |
| 2.5 | Testen op toestel: `web-ext run -t firefox-android` of `about:debugging` via USB | ⬜ | |
| 2.6 | Checklist draaien op mobiel; mobiel-specifieke rijen toevoegen | ⬜ | |
| 2.7 | Accu/CPU: MutationObserver + 1s-interval meten op telefoon | 🟡 | verborgen tab doet nu niets meer; meten moet nog |

## Fase 3 — Publiceren

| # | Taak | Status | Notitie |
|---|------|--------|---------|
| 3.1 | AMO-inzending, Android-compatibiliteit aanvinken | ⬜ | |
| 3.2 | Store-teksten `_locales/*/messages.json` opwaarderen (nu functioneel, geen marketing) | ⬜ | |
| 3.3 | Privacyverklaring: extensie stuurt niets weg behalve optionele remote config-URL | ⬜ | beide stores vragen dit |
| 3.4 | Screenshots per store (desktop + mobiel) | ⬜ | |
| 3.5 | Chrome Web Store-inzending | ⬜ | |

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

## Buildcommando

```bash
node tools/build.js
```

`dist/chrome` en `dist/firefox` bevatten daarna elk een complete, laadbare extensie.
