# Privacy policy — Fullscreen Fill

Last updated: 26 September 2026

Fullscreen Fill collects no personal data, uses no analytics, and sends nothing
about you or your browsing in the background. The only way anything reaches the
developer is a bug report you write and send yourself.

## English

### What the extension stores

Everything stays in your own browser's storage.

| Key | Where | What |
|-----|-------|------|
| `enabled` | `storage.sync` | whether widescreen filling is on |
| `urlBlacklist` | `storage.sync` | domains and URLs you excluded yourself |
| `playerTypes` | `storage.sync` | which player types you switched off |
| `fillMode`, `stretchLimit`, `overLimit`, `minAspect` | `storage.sync` | stretch or zoom, the stretch limit, what happens past it, and the narrowest video to fill |
| `uiLang` | `storage.sync` | the popup language you picked |
| `configUrl` | `storage.sync` | optional remote config URL you enter yourself |
| `remoteConfig`, `configFetchedAt`, `configSource`, `configFetchError` | `storage.local` | the last loaded configuration and its status |
| `reportContext`, `reportOpen` | `storage.local` | the domain and page status a bug report starts from (see *Bug reports*) |

`storage.sync` means your browser syncs these settings between your own devices
through your Google or Mozilla account. That runs through your browser, not
through any server of this extension. If you do not want it, turn off browser
sync.

### Network traffic

The extension makes exactly one kind of network request, and only if you set it
up yourself: fetching the **remote config URL** you type into the popup. That
request contains nothing but the URL — no information about pages you visit,
videos you watch or the device you use.

Leave the field empty and the extension uses the configuration bundled with it,
and no traffic leaves your machine at all.

### Bug reports

Nothing is sent in the background. When you choose **Report a problem**, the
settings page shows the complete report before anything leaves your browser,
and you send it yourself:

- **Report on GitHub** opens a prefilled issue on github.com. That needs a GitHub
  account, and the report is **public** there, under your GitHub name.
- **Send by email** opens your own mail app with a prefilled message to
  fullscreenfill@gmail.com. It stays between you and the developer.

The report holds what you type: what went wrong and, if you like, your device.
Two things are added only when you tick them, and on Firefox only after the
browser's own consent prompt:

- **the site**: only the domain, such as `youtube.com`, never the full address
  (Firefox: *browsing activity*)
- **technical details**: extension version, your settings (the blacklist only as
  a count), browser and version, operating system, screen size, and what the
  extension did on that page (Firefox: *technical and interaction data*)

To carry the page you were on from the popup to the report form, the popup keeps
that domain and page status in `storage.local` (`reportContext`). The form
ignores it after 30 minutes, and the next report overwrites it.

Reports are used for one thing: fixing the problem they describe.

### What the extension does on pages

To make video fill the screen, the content script reads the dimensions of
`<video>` and `<iframe>` elements and applies CSS. That information stays inside
the page: it is not stored, not logged and not transmitted.

Page content, form data, passwords and cookies are not read.

### Why each permission is needed

| Permission | Used for |
|------------|----------|
| `storage` | keeping your settings (see the table above) |
| `alarms` | checking every 6 hours whether your remote config changed — only if you set one |
| `activeTab` | the popup shows which player type the current tab runs; the "block this page" button needs the URL, and *Report a problem* passes on its domain |
| site access (`*://*/*`) | video players exist on any site; without this the extension cannot adjust them. To narrow it down, use the URL blacklist or set site access to "on click" in your browser |

`photos.google.com` is explicitly excluded in the manifest; the extension never
runs there.

### No selling, no sharing

Nothing is sold or shared. There is no server of this extension, no account and
no tracking.

### Questions

Report problems or questions through the project's issue tracker:
<https://github.com/redubbledd1-ops/Fullscreen-Fill/issues>

---

## Nederlands

Fullscreen Fill verzamelt geen persoonsgegevens, gebruikt geen analytics, en
stuurt niets over jou of je surfgedrag op de achtergrond weg. Het enige dat de
ontwikkelaar ooit bereikt is een melding die jij zelf schrijft en verstuurt.

### Wat de extensie opslaat

Alles blijft in de opslag van je eigen browser.

| Sleutel | Waar | Wat |
|---------|------|-----|
| `enabled` | `storage.sync` | staat breedbeeld aan of uit |
| `urlBlacklist` | `storage.sync` | domeinen/URL's die jij hebt uitgesloten |
| `playerTypes` | `storage.sync` | welke spelertypes je hebt uitgezet |
| `fillMode`, `stretchLimit`, `overLimit`, `minAspect` | `storage.sync` | uitrekken of zoomen, de grens, wat er daarboven gebeurt, en de smalste video die gevuld wordt |
| `uiLang` | `storage.sync` | gekozen taal van de popup |
| `configUrl` | `storage.sync` | optionele remote config-URL die jij zelf invult |
| `remoteConfig`, `configFetchedAt`, `configSource`, `configFetchError` | `storage.local` | de laatst geladen configuratie en de status daarvan |
| `reportContext`, `reportOpen` | `storage.local` | het domein en de paginastatus waar een melding mee begint (zie *Probleem melden*) |

`storage.sync` betekent dat je browser deze instellingen synchroniseert tussen je
eigen apparaten, via je Google- of Mozilla-account. Dat loopt via je browser, niet
via een server van deze extensie. Wil je dat niet, zet dan browser-sync uit.

### Netwerkverkeer

De extensie doet precies één soort netwerkverzoek, en alleen als jij dat zelf
instelt: het ophalen van de **remote config-URL** die je in de popup invult
(popup → URL check). Dat verzoek bevat alleen die URL; er gaat geen informatie
over bezochte pagina's, video's of je apparaat mee.

Vul je geen URL in, dan gebruikt de extensie de meegeleverde configuratie en gaat
er helemaal geen verkeer naar buiten.

### Probleem melden

Er gaat niets op de achtergrond weg. Kies je **Probleem melden**, dan toont de
instellingenpagina de volledige melding voordat er iets je browser verlaat, en
verstuur je hem zelf:

- **Melden via GitHub** opent een ingevuld issue op github.com. Daarvoor heb je een
  GitHub-account nodig, en de melding is daar **openbaar**, onder je GitHub-naam.
- **Mailen** opent je eigen mail-app met een ingevuld bericht aan
  fullscreenfill@gmail.com. Dat blijft tussen jou en de ontwikkelaar.

De melding bevat wat jij typt: wat er misging en, als je wil, je toestel. Twee
dingen komen er alleen bij als je ze aanvinkt, en in Firefox pas nadat de browser
zelf om toestemming heeft gevraagd:

- **de site**: alleen het domein, bijvoorbeeld `youtube.com`, nooit het volledige
  adres (Firefox: *surfactiviteit*)
- **technische gegevens**: versie van de extensie, je instellingen (de blacklist
  alleen als aantal), browser en versie, besturingssysteem, schermformaat, en wat
  de extensie op die pagina deed (Firefox: *technische en interactiegegevens*)

Om de pagina waar je was van de popup naar het meldformulier mee te nemen, bewaart
de popup dat domein en de paginastatus in `storage.local` (`reportContext`). Het
formulier negeert dat na 30 minuten, en de volgende melding overschrijft het.

Meldingen worden voor één ding gebruikt: het probleem oplossen dat erin staat.

### Wat de extensie op pagina's doet

Om video's breed te kunnen maken leest het content script de afmetingen van
`<video>`- en `<iframe>`-elementen en past het CSS toe. Die informatie blijft in de
pagina: ze wordt niet opgeslagen, niet gelogd en niet verstuurd.

Pagina-inhoud, formuliergegevens, wachtwoorden en cookies worden niet gelezen.

### Waarom de gevraagde rechten nodig zijn

| Recht | Waarvoor |
|-------|----------|
| `storage` | je instellingen bewaren (zie tabel hierboven) |
| `alarms` | elke 6 uur kijken of je remote config is bijgewerkt — alleen als je er een hebt ingesteld |
| `activeTab` | de popup laat zien welk spelertype de huidige tab draait; de knop "Huidige pagina blokkeren" heeft de URL nodig, en *Probleem melden* geeft het domein door |
| toegang tot websites (`*://*/*`) | video's kunnen op elke site staan; zonder deze toegang kan de extensie ze niet aanpassen. Wil je het beperken, gebruik dan de URL-blacklist of zet de sitetoegang in je browser op "alleen bij klikken" |

`photos.google.com` is expliciet uitgesloten in het manifest; daar draait de
extensie nooit.

### Geen verkoop, geen deling

Er wordt niets verkocht of gedeeld. Er is geen server van deze extensie, geen
account en geen tracking.

### Vragen

Meld problemen of vragen via de issue-tracker van het project.
