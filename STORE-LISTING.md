# Store-inzending — teksten en antwoorden

Kopieerklaar materiaal voor Chrome Web Store en addons.mozilla.org (AMO).
Naam en korte omschrijving staan óók in `_locales/*/messages.json`; die twee
moeten gelijk blijven.

---

## Naam

`Fullscreen Fill`

## Korte omschrijving (max 132 tekens, Chrome)

**NL** — Rek landscape-video uit tot je hele scherm: geen zwarte balken, geen crop. Werkt op de meeste sites, instelbaar per site.

**EN** — Stretch landscape video to fill your whole screen: no black bars, no zoom crop. Works on most sites, adjustable per site.

## Lange omschrijving (EN)

```
Fullscreen Fill stretches landscape video so it fills your screen instead of
leaving black bars on a 21:9 or ultrawide display. It stretches - it does not
zoom and crop - so nothing is cut off the top, bottom or sides.

- Works on regular HTML5 players, MSE players (YouTube and most streaming
  sites), protected DRM players and players inside iframes.
- Portrait video is never stretched.
- Small previews and thumbnails are left alone.
- Turn it off for a single page, a whole domain, or a player type you do not
  want it on.
- The popup shows which player type the current tab is running and whether
  widescreen is active, so you can see why something did or did not change.
- Interface follows your browser language (English, Dutch, German, French,
  Spanish) and can be switched by hand.

No accounts, no analytics, no data collection. The only network request the
extension can make is fetching a configuration URL that you enter yourself.
```

## Lange omschrijving (NL)

```
Fullscreen Fill rekt landscape-video uit tot je scherm gevuld is, in plaats van
zwarte balken op een 21:9- of ultrawide-monitor. Het rekt uit - het zoomt niet in
en snijdt niet bij - dus er valt niets weg aan de boven-, onder- of zijkant.

- Werkt op gewone HTML5-spelers, MSE-spelers (YouTube en de meeste
  streamingsites), beveiligde DRM-spelers en spelers in een iframe.
- Verticale video wordt nooit uitgerekt.
- Kleine previews en thumbnails blijven met rust.
- Uit te zetten per pagina, per domein, of per spelertype.
- De popup toont welk spelertype de huidige tab draait en of breedbeeld actief
  is, zodat je ziet waarom er wel of niets verandert.
- De interface volgt je browsertaal (Nederlands, Engels, Duits, Frans, Spaans)
  en is handmatig te wisselen.

Geen account, geen analytics, geen gegevensverzameling. Het enige netwerkverzoek
dat de extensie kan doen is het ophalen van een configuratie-URL die je zelf
invult.
```

---

## Chrome Web Store — verplichte velden

**Single purpose**

> Adjust the display of video players on web pages so landscape video fills the
> screen instead of showing black bars.

**Rechtvaardiging per recht**

| Recht | Tekst |
|-------|-------|
| `storage` | Stores the user's own settings: on/off, the URL blacklist, which player types are enabled and the interface language. |
| `alarms` | Schedules a periodic check for an updated configuration file, only when the user has entered a configuration URL. |
| `activeTab` | The popup reads the active tab's URL for the "block this page" action and asks the content script which player type that tab is running. |
| Host permission `*://*/*` | Video players exist on any website, so the content script has to be able to run on any site the user visits. The extension does not read page content; it measures video and iframe elements and applies CSS. |
| Remote code | None. All code ships with the extension. The optional configuration URL returns JSON data (CSS strings and numeric thresholds), never executable code. |

**Data usage disclosure**

- Verzamelt geen gebruikersgegevens: geen persoonsgegevens, geen gezondheids-,
  financiële, authenticatie- of locatiegegevens, geen persoonlijke communicatie,
  geen surfgeschiedenis, geen website-inhoud.
- Verkoopt niets aan derden, gebruikt niets voor advertenties, gebruikt niets
  voor kredietwaardigheid.
- Privacyverklaring-URL:
  `https://github.com/redubbledd1-ops/Fullscreen-Fill/blob/main/PRIVACY.md`
  (de repo is openbaar; de verklaring staat er in het Engels en het Nederlands).

---

## AMO — aandachtspunten

- `browser_specific_settings.gecko.id` is `fullscreen-fill@redubbledd1-ops.github.io`.
  Na de eerste inzending ligt die vast: wijzigen maakt er een nieuwe add-on van.
- Bij "compatibiliteit" **Android** aanvinken; `gecko_android.strict_min_version`
  staat al in het manifest.
- `data_collection_permissions` is verplicht voor elke nieuwe extensie; zonder die
  sleutel wordt de zip bij de validatie geweigerd. Hij staat op `{"required":
  ["none"]}` omdat de extensie niets verzamelt of verstuurt: de enige fetch naar
  buiten is de config-URL die de gebruiker zelf invult, en daar gaat geen gegeven
  over de gebruiker in mee. `none` mag niet met andere waarden gecombineerd
  worden. Firefox toont dit bij de installatie en op de AMO-pagina.
- Broncode-toelichting is niet nodig: er zit geen build-stap of minificatie in de
  ingediende map. `tools/build.js` kopieert alleen bestanden en kiest het juiste
  manifest.
- In te dienen bestand: zip van de **inhoud** van `dist/firefox` (manifest in de
  root van de zip, niet in een submap).

---

## Beeldmateriaal

| Asset | Maat | Verplicht | Waar |
|-------|------|-----------|------|
| Store-icoon | 128×128 | ja | `store/icon-128.png` |
| Screenshots | 1280×800 of 640×400 | ja, 1 t/m 5 | nog te maken — zie shot list |
| Klein promotievak | 440×280 | ja (Chrome) | nog te maken |
| Marquee-promotievak | 1400×560 | nee | nog te maken |
| Groot icoon | 512×512 | nee | `store/icon-512.png` (AMO) |
| YouTube-video | — | nee | het enige veld dat bewegend beeld toelaat |

Iconen komen uit `store/icon-source.png` via `python tools/make-icons.py`.

Twee regels die makkelijk misgaan:

- **Store-icoon heeft een rand nodig.** Chrome wil 96×96 kunstwerk met 16 px
  transparante ruimte eromheen, samen 128×128 — de store legt er zelf afronding
  en schaduw overheen. `store/icon-128.png` is zo opgebouwd. De iconen in
  `icons/` zijn bewust randloos; die gaan naar de werkbalk, niet naar de store.
- **Screenshots zijn statisch.** Vierkante hoeken, full bleed, geen animatie.
  Een uitlegfilmpje hoort in het YouTube-veld, niet in een screenshot.

## In te dienen bestand

```bash
node tools/build.js && python tools/pack.py
```

Levert `dist/chrome-<versie>.zip` en `dist/firefox-<versie>.zip`, met het manifest
in de root van de zip zoals beide stores vragen.

## Screenshots (shot list)

| # | Scherm | Waarom |
|---|--------|--------|
| 1 | Zelfde video voor/na, ultrawide monitor | toont waar het om gaat |
| 2 | Popup open, paneel Spelertypes uitgeklapt | toont de statusregel en de vinkjes |
| 3 | Popup met URL blacklist gevuld | toont per-site controle |
| 4 | Mobiel: popup op telefoon | nodig voor AMO Android-listing |
| 5 | Portrait-video zonder stretch | laat zien dat het niet alles klakkeloos uitrekt |

---

## Vóór inzending afvinken

- [ ] gecko-ID vervangen (alleen AMO)
- [x] versienummer gelijk in `manifest.json` en `manifest.firefox.json` (1.18.0)
- [x] `node tools/build.js` gedraaid
- [x] Store-iconen gegenereerd (`store/icon-128.png`, `store/icon-512.png`)
- [x] Upload-zips gemaakt (`python tools/pack.py`)
- [ ] Beide mappen geladen en getest na de icoonwissel
- [ ] TEST-CHECKLIST smoke gedraaid op desktop én telefoon
- [x] Privacyverklaring op een publieke URL (PRIVACY.md in de openbare repo, EN + NL)
- [ ] Screenshots gemaakt (minimaal 1 van 1280×800 voor Chrome)
- [ ] Klein promotievak 440×280 gemaakt (verplicht bij Chrome)
- [x] Ontwikkelaarsaccount Chrome Web Store betaald op redubbledd1@gmail.com
