# Privacyverklaring — Widescreen Fill

Laatst bijgewerkt: 19 september 2026

Widescreen Fill verzamelt geen persoonsgegevens, gebruikt geen analytics, en
stuurt niets over jou of je surfgedrag naar de ontwikkelaar of naar derden.

## Wat de extensie opslaat

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

## Netwerkverkeer

De extensie doet precies één soort netwerkverzoek, en alleen als jij dat zelf
instelt: het ophalen van de **remote config-URL** die je in de popup invult
(popup → URL check). Dat verzoek bevat alleen die URL; er gaat geen informatie
over bezochte pagina's, video's of je apparaat mee.

Vul je geen URL in, dan gebruikt de extensie de meegeleverde configuratie en gaat
er helemaal geen verkeer naar buiten.

## Wat de extensie op pagina's doet

Om video's breed te kunnen maken leest het content script de afmetingen van
`<video>`- en `<iframe>`-elementen en past het CSS toe. Die informatie blijft in de
pagina: ze wordt niet opgeslagen, niet gelogd en niet verstuurd.

Pagina-inhoud, formuliergegevens, wachtwoorden en cookies worden niet gelezen.

## Waarom de gevraagde rechten nodig zijn

| Recht | Waarvoor |
|-------|----------|
| `storage` | je instellingen bewaren (zie tabel hierboven) |
| `alarms` | elke 6 uur kijken of je remote config is bijgewerkt — alleen als je er een hebt ingesteld |
| `activeTab` | de popup laat zien welk spelertype de huidige tab draait, en de knop "Huidige pagina blokkeren" heeft de URL nodig |
| toegang tot websites (`*://*/*`) | video's kunnen op elke site staan; zonder deze toegang kan de extensie ze niet aanpassen. Wil je het beperken, gebruik dan de URL-blacklist of zet de sitetoegang in je browser op "alleen bij klikken" |

`photos.google.com` is expliciet uitgesloten in het manifest; daar draait de
extensie nooit.

## Geen verkoop, geen deling

Er zijn geen gegevens om te verkopen of te delen. Er is geen server, geen account
en geen tracking.

## Vragen

Meld problemen of vragen via de issue-tracker van het project.
