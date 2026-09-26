# Store-inzending — teksten en antwoorden

Kopieerklaar materiaal voor Chrome Web Store en addons.mozilla.org (AMO).
Naam en korte omschrijving staan óók in `_locales/*/messages.json`; die twee
moeten gelijk blijven.

---

## Naam

`Fullscreen Fill`

## Korte omschrijving (max 132 tekens, Chrome)

**NL** — Vul je hele scherm met liggende video: zoom of rek de zwarte balken weg. Per site instelbaar, staande video blijft zoals hij is.

**EN** — Fill your whole screen with landscape video: zoom or stretch away the black bars. Per-site control, portrait video left alone.

## Lange omschrijving (EN)

```
Fullscreen Fill makes landscape video fill your screen instead of leaving
black bars - on a 21:9 or ultrawide monitor, a 16:10 laptop or a phone.

Two ways to fill, your choice:
- Zoom (default): the picture is enlarged until the screen is covered. The
  edges are cropped; nothing is distorted.
- Stretch: the whole picture stays visible and is stretched to the screen -
  optionally only up to a limit you set, with zoom or the original bars
  beyond it.

- Works on regular HTML5 players, MSE players (YouTube and most streaming
  sites), protected DRM players and players inside iframes.
- Portrait video is never touched, and with "Fill from" square or other
  narrow videos stay exactly as the site shows them.
- Small previews and thumbnails are left alone.
- Turn it off for a single page, a whole domain, or a player type you do not
  want it on.
- The popup shows what happened on the current tab - stretched, zoomed or bars
  kept, and why - so you can see why something did or did not change.
- A settings page on desktop and on Firefox for Android. The interface follows
  your browser language (English, Dutch, German, French, Spanish) and can be
  switched by hand.
- Report a problem from the popup: you see the whole report and send it
  yourself, as a GitHub issue or an email.

No accounts, no analytics, nothing sent in the background. Bug reports are
written and sent by you, with device or site details only if you tick them.
The only network request the extension can make is fetching a configuration
URL that you enter yourself.
```

## Lange omschrijving (NL)

```
Fullscreen Fill laat liggende video je hele scherm vullen, in plaats van
zwarte balken - op een 21:9- of ultrawide-monitor, een 16:10-laptop of een
telefoon.

Twee manieren om te vullen, jij kiest:
- Zoomen (standaard): het beeld wordt vergroot tot het scherm vol is. De randen
  vallen weg; niets wordt vervormd.
- Uitrekken: het hele beeld blijft zichtbaar en wordt uitgerekt tot het scherm -
  desgewenst alleen tot een grens die je zelf kiest, met daarboven zoomen of de
  oorspronkelijke balken.

- Werkt op gewone HTML5-spelers, MSE-spelers (YouTube en de meeste
  streamingsites), beveiligde DRM-spelers en spelers in een iframe.
- Staande video blijft altijd zoals hij is, en met "Vullen vanaf" blijven ook
  vierkante of andere smalle video's precies zoals de site ze toont.
- Kleine previews en thumbnails blijven met rust.
- Uit te zetten per pagina, per domein, of per spelertype.
- De popup toont wat er op de huidige tab gebeurde - uitgerekt, gezoomd of
  balken, en waarom - zodat je ziet waarom er wel of niets verandert.
- Een instellingenpagina op de computer en in Firefox voor Android. De
  interface volgt je browsertaal (Nederlands, Engels, Duits, Frans, Spaans) en
  is handmatig te wisselen.
- Een probleem melden kan vanuit de popup: je ziet de hele melding en verstuurt
  hem zelf, als GitHub-issue of per mail.

Geen account, geen analytics, niets op de achtergrond verstuurd. Meldingen
schrijf en verstuur je zelf, met toestel- of sitegegevens alleen als je die
aanvinkt. Het enige netwerkverzoek dat de extensie kan doen is het ophalen van
een configuratie-URL die je zelf invult.
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
| `activeTab` | The popup reads the active tab's URL for the "block this page" action and for the "report a problem" form (domain only), and asks the content script which player type that tab is running. |
| Host permission `*://*/*` | Video players exist on any website, so the content script has to be able to run on any site the user visits. The extension does not read page content; it measures video and iframe elements and applies CSS. |
| Remote code | None. All code ships with the extension. The optional configuration URL returns JSON data (CSS strings and numeric thresholds), never executable code. |

**Data usage disclosure**

- Op de achtergrond gaat niets weg. Wel kan een gebruiker zelf een melding sturen
  (GitHub-issue of mail); alleen als hij dat aanvinkt staan daar het **domein**
  van de pagina en technische gegevens in. Vink daarom **Web history** aan, met
  als toelichting: *only the domain of the current page, only inside a bug
  report the user writes, ticks and sends themselves*. De rest blijft uit: geen
  persoonsgegevens, gezondheids-, financiële, authenticatie- of locatiegegevens,
  geen persoonlijke communicatie, geen website-inhoud.
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
  sleutel wordt de zip bij de validatie geweigerd. `required` staat op `["none"]`:
  op de achtergrond gaat niets weg. `optional` noemt `technicalAndInteraction` en
  `browsingActivity` voor het meldformulier; Firefox vraagt die pas als de
  gebruiker "technische gegevens" of "site" aanvinkt. `none` mag niet met andere
  *required*-waarden gecombineerd worden. Firefox toont dit bij de installatie en
  op de AMO-pagina.
- De ondergrens staat daarom op Firefox **140** en Firefox Android **142**: dat
  zijn de versies die `data_collection_permissions` kennen. Lager zetten levert
  een validatiewaarschuwing op dat de sleutel daar nog niet bestaat. Het kost
  geen publiek — Firefox stond in september 2026 op 155 en zelfs ESR op 153.
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
