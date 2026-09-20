# Privacy policy — Fullscreen Fill

Last updated: 20 September 2026

Fullscreen Fill collects no personal data, uses no analytics, and sends nothing
about you or your browsing to the developer or to anyone else.

## English

### What the extension stores

Everything stays in your own browser's storage.

| Key | Where | What |
|-----|-------|------|
| `enabled` | `storage.sync` | whether widescreen filling is on |
| `urlBlacklist` | `storage.sync` | domains and URLs you excluded yourself |
| `playerTypes` | `storage.sync` | which player types you switched off |
| `uiLang` | `storage.sync` | the popup language you picked |
| `configUrl` | `storage.sync` | optional remote config URL you enter yourself |
| `remoteConfig`, `configFetchedAt`, `configSource`, `configFetchError` | `storage.local` | the last loaded configuration and its status |

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
| `activeTab` | the popup shows which player type the current tab runs, and the "block this page" button needs the URL |
| site access (`*://*/*`) | video players exist on any site; without this the extension cannot adjust them. To narrow it down, use the URL blacklist or set site access to "on click" in your browser |

`photos.google.com` is explicitly excluded in the manifest; the extension never
runs there.

### No selling, no sharing

There is no data to sell or share. There is no server, no account and no
tracking.

### Questions

Report problems or questions through the project's issue tracker:
<https://github.com/redubbledd1-ops/Fullscreen-Fill/issues>

---

## Nederlands

Fullscreen Fill verzamelt geen persoonsgegevens, gebruikt geen analytics, en
stuurt niets over jou of je surfgedrag naar de ontwikkelaar of naar derden.

### Wat de extensie opslaat

Alles blijft in de opslag van je eigen browser.

| Sleutel | Waar | Wat |
|---------|------|-----|
| `enabled` | `storage.sync` | staat breedbeeld aan of uit |
| `urlBlacklist` | `storage.sync` | domeinen/URL's die jij hebt uitgesloten |
| `playerTypes` | `storage.sync` | welke spelertypes je hebt uitgezet |
| `uiLang` | `storage.sync` | gekozen taal van de popup |
| `configUrl` | `storage.sync` | optionele remote config-URL die jij zelf invult |
| `remoteConfig`, `configFetchedAt`, `configSource`, `configFetchError` | `storage.local` | de laatst geladen configuratie en de status daarvan |

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
| `activeTab` | de popup laat zien welk spelertype de huidige tab draait, en de knop "Huidige pagina blokkeren" heeft de URL nodig |
| toegang tot websites (`*://*/*`) | video's kunnen op elke site staan; zonder deze toegang kan de extensie ze niet aanpassen. Wil je het beperken, gebruik dan de URL-blacklist of zet de sitetoegang in je browser op "alleen bij klikken" |

`photos.google.com` is expliciet uitgesloten in het manifest; daar draait de
extensie nooit.

### Geen verkoop, geen deling

Er zijn geen gegevens om te verkopen of te delen. Er is geen server, geen account
en geen tracking.

### Vragen

Meld problemen of vragen via de issue-tracker van het project.
