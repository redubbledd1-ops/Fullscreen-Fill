// The settings page (Add-ons -> Fullscreen Fill -> Settings) is the popup,
// shown without the parts about the current tab: one page to keep up to date
// instead of two. The manifest cannot pass it a query string everywhere, so
// this page does.
location.replace("popup.html?view=options");
