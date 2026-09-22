# AMO-inzending — veld voor veld

Kopieerklaar. De Chrome-teksten staan in [STORE-LISTING.md](STORE-LISTING.md);
dit bestand gaat alleen over addons.mozilla.org, waar de velden anders heten en
AMO de privacyverklaring als *tekst* wil in plaats van als URL.

---

## Summary (max 250)

```
Stretch landscape video to fill the whole window: no black bars, no zoom crop, nothing cut off. Works in fullscreen and on-page, on HTML5, MSE, DRM and iframe players. Switch it off per page, per site or per player type.
```

220 tekens. Reviewers gebruiken dit veld om te bepalen wat ze moeten testen, dus
het noemt expliciet de spelertypes en de uit-knoppen.

## Description

```markdown
Fullscreen Fill stretches landscape video so it fills your screen instead of
leaving black bars on a 21:9 or ultrawide display. It stretches — it does not
zoom and crop — so nothing is cut off the top, bottom or sides.

**What it works on**

* Regular HTML5 players
* MSE players (YouTube and most streaming sites)
* Protected DRM players
* Players inside iframes

**What it leaves alone**

* Portrait video is never stretched
* Small previews and thumbnails are ignored
* Any page, site or player type you switch off yourself

**Staying in control**

The popup shows which player type the current tab is running and whether the
fill is active, so you can see why something did or did not change. Turn it off
for a single page, a whole domain, or a player type you never want it on.

The interface follows your browser language — English, Dutch, German, French or
Spanish — and can be switched by hand.

No accounts, no analytics, no data collection. The only network request the
extension can make is fetching a configuration URL that you enter yourself, and
that field is empty until you fill it in.
```

## Aanvinkvelden

| Veld | Antwoord | Waarom |
|------|----------|--------|
| This add-on is experimental | **nee** | "Experimental" verbergt hem uit zoekresultaten en zet een waarschuwing op de pagina. Dit is 1.19.2, geen proefballon. |
| Requires payment / hardware | **nee** | Gratis, geen account, geen externe dienst. |

## Categorieën (max 3, kies er 2)

- **Photos, Music & Videos** — de voor de hand liggende
- **Appearance** — het past aan hoe pagina's er uitzien

Niet **Privacy & Security**: de extensie beschermt niets, ze verzamelt alleen
niets. Een derde categorie erbij die maar half past valt reviewers op; twee
goede is sterker dan drie halve.

## Support

| Veld | Waarde |
|------|--------|
| Support email | **leeg laten** |
| Support website | `https://github.com/redubbledd1-ops/Fullscreen-Fill/issues` |

Het e-mailadres komt openbaar op de add-on-pagina te staan en wordt geoogst door
spammers. De issue-tracker doet hetzelfde werk, is openbaar te doorzoeken, en
andere gebruikers zien elkaars meldingen.

## License

De repo heeft geen `LICENSE`-bestand. Zonder zo'n bestand is de code juridisch
**All Rights Reserved**, ook al staat hij openbaar op GitHub.

Twee eerlijke opties:

- **All Rights Reserved** — klopt met de huidige stand, niets te doen.
- **MIT** — als je wil dat mensen de code mogen lezen, forken en hergebruiken.
  Kies dit alleen samen met een echt `LICENSE`-bestand in de repo, anders spreken
  je add-on-pagina en je repo elkaar tegen.

## Privacy Policy

Aanvinken: **ja**. AMO wil de tekst zelf, niet een link. Plak dit:

```markdown
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

## Network traffic

The extension makes exactly one kind of network request, and only if you set it
up yourself: fetching the **remote config URL** you type into the popup. That
request contains nothing but the URL — no information about pages you visit,
videos you watch or the device you use.

Leave the field empty and the extension uses the configuration bundled with it,
and no traffic leaves your machine at all.

## What the extension does on pages

To make video fill the screen, the content script reads the dimensions of
`<video>` and `<iframe>` elements and applies CSS. That information stays inside
the page: it is not stored, not logged and not transmitted.

Page content, form data, passwords and cookies are not read.

## Why each permission is needed

| Permission | Used for |
|------------|----------|
| `storage` | keeping your settings (see the table above) |
| `alarms` | checking every 6 hours whether your remote config changed — only if you set one |
| `activeTab` | the popup shows which player type the current tab runs, and the "block this page" button needs the URL |
| site access (`*://*/*`) | video players exist on any site; without this the extension cannot adjust them. To narrow it down, use the URL blacklist or set site access to "on click" in your browser |

`photos.google.com` is explicitly excluded in the manifest; the extension never
runs there.

## No selling, no sharing

There is no data to sell or share. There is no server, no account and no
tracking.

## Questions

Report problems or questions through the project's issue tracker:
<https://github.com/redubbledd1-ops/Fullscreen-Fill/issues>
```

## Notes to Reviewer

```
Source code: https://github.com/redubbledd1-ops/Fullscreen-Fill

BUILD
There is no bundler, transpiler or minifier. tools/build.js copies the shared
files unchanged and writes manifest.firefox.json as the manifest. The submitted
zip is byte-identical to the repository contents plus that manifest swap.

  git clone https://github.com/redubbledd1-ops/Fullscreen-Fill
  cd Fullscreen-Fill
  node tools/build.js firefox     # -> dist/firefox
  python tools/pack.py firefox    # -> dist/firefox-<version>.zip

HOW TO SEE IT WORKING
The extension only acts when the video's aspect ratio differs from the window,
so on a 16:9 window playing a 16:9 video there is nothing to fix and nothing
will appear to happen. To reproduce the effect, make the browser window much
wider than it is tall (drag it out on a wide monitor, or use an ultrawide
display) and play any normal 16:9 video. Without the extension you get black
bars left and right; with it the picture fills the width. Portrait video is
deliberately left untouched.

The toolbar popup shows which player type the current tab is running (native,
MSE, DRM or iframe) and whether the fill is currently active, which is the
quickest way to confirm the extension is doing something.

NETWORK
By default the extension makes no outbound requests at all. It reads the bundled
config/defaults.json through runtime.getURL. The popup has an optional
"config URL" field; only if a user types a URL there does background.js fetch it,
and that request carries nothing but the URL itself. The field is empty on a
fresh install, so no configuration is needed to review the add-on.

PERMISSIONS
The host permission covers all sites because video players exist anywhere. The
content script measures <video> and <iframe> elements and applies CSS; it does
not read page text, form data, cookies or credentials. photos.google.com is
excluded in the manifest.

No account, login or payment is needed to test.
```

---

## Voor je op Submit drukt

- [ ] `dist/firefox/` geladen via `about:debugging` en de smoke-test gedraaid
- [ ] licentie gekozen (en bij MIT: `LICENSE` in de repo gezet)
- [ ] screenshots geüpload — mag bij AMO ook ná de eerste inzending
