/**
 * Popup UI strings.
 *
 * chrome.i18n / _locales cannot be switched at runtime, so the popup keeps its
 * own table: "auto" follows the browser UI language, and the dropdown lets the
 * user override it. _locales is only used for the store name/description.
 */
const WsFillI18n = (() => {
  const FALLBACK = "en";

  const MESSAGES = {
    en: {
      langLabel: "Language",
      langAuto: "Automatic (browser language)",
      enabled: "Widescreen on",

      tabBusy: "Current tab: checking…",
      tabUnknown: "Current tab: unknown (reload the page after updating)",
      tabNoPlayer: "Current tab: no player found",
      tabLine: "Current tab: {type} · {why}",
      whyActive: "widescreen active",
      whyOff: "extension off",
      whyBlacklisted: "blacklisted",
      whyType: "this player type is off",
      whyFsOnly: "fullscreen only",
      whyInactive: "not active right now",

      types: "Player types",
      typesOff: "Player types ({n} off)",
      typesOffOne: "Player types (1 off)",
      typeNative: "Native (mp4 / direct source)",
      typeMse: "MSE (YouTube, most streaming)",
      typeDrm: "DRM (Netflix, Prime, protected)",
      typeEmbed: "Iframe embed (player in a frame)",
      typeBadge: "this tab",
      typesHint:
        "An unchecked type never gets widescreen, on any site. One type per video, in this order: DRM → iframe embed → MSE → native.",

      blacklist: "URL blacklist",
      blacklistN: "URL blacklist ({n})",
      blacklistPlaceholder: "domain or URL, e.g. example.com",
      add: "Add",
      blockCurrent: "Block current page",
      blockWhat: "What do you want to block?",
      blockUrlLine: "This URL only: {url}",
      blockDomainLine: "Whole domain: {domain}",
      chooseUrl: "This URL only",
      chooseDomain: "Whole domain",
      cancel: "Cancel",
      emptyList: "No URLs blocked yet.",
      remove: "Remove",
      blacklistHint:
        "Type and press Add, or block the current tab and pick URL or domain.",
      noTabUrl: "No active tab URL found.",
      cannotBlock:
        "This page cannot be blacklisted (chrome:// or internal page).",
      tabReadError: "Could not read tab: {err}",
      entryYoutube: "YouTube video ({id})",
      entryDomain: "Domain: {domain}",

      urlCheck: "URL check",
      configUrlLabel: "Remote config URL (optional)",
      configLoading: "Loading config…",
      configStatus: "Config v{v} · source: {s} · {t}",
      configStatusError: " · error: {err}",
      configUnavailable: "Config status unavailable.",
      checkNow: "Check now",
      checking: "Checking…",
      checkOk: "OK · source: {s} · v{v}",
      checkFailed: "Failed: {err} (fallback active)",
      swUnreachable: "Service worker unreachable",
      unknownError: "unknown",
      urlCheckHint:
        "Optional: update remote selectors. Without a URL the built-in config stays active.",
    },

    nl: {
      langLabel: "Taal",
      langAuto: "Automatisch (browsertaal)",
      enabled: "Breedbeeld aan",

      tabBusy: "Huidige tab: bezig…",
      tabUnknown: "Huidige tab: onbekend (pagina herladen na update)",
      tabNoPlayer: "Huidige tab: geen speler gevonden",
      tabLine: "Huidige tab: {type} · {why}",
      whyActive: "breedbeeld actief",
      whyOff: "extensie uit",
      whyBlacklisted: "geblacklist",
      whyType: "dit spelertype staat uit",
      whyFsOnly: "alleen in fullscreen",
      whyInactive: "nu niet actief",

      types: "Spelertypes",
      typesOff: "Spelertypes ({n} uit)",
      typesOffOne: "Spelertypes (1 uit)",
      typeNative: "Native (mp4 / directe bron)",
      typeMse: "MSE (YouTube, meeste streaming)",
      typeDrm: "DRM (Netflix, Prime, beveiligd)",
      typeEmbed: "Iframe-embed (speler in frame)",
      typeBadge: "deze tab",
      typesHint:
        "Uitgevinkt type krijgt nooit breedbeeld, op geen enkele site. Eén type per video, volgorde: DRM → iframe-embed → MSE → native.",

      blacklist: "URL blacklist",
      blacklistN: "URL blacklist ({n})",
      blacklistPlaceholder: "domein of URL, bijv. example.com",
      add: "Toevoegen",
      blockCurrent: "Huidige pagina blokkeren",
      blockWhat: "Wat wil je blokkeren?",
      blockUrlLine: "Alleen deze URL: {url}",
      blockDomainLine: "Heel domein: {domain}",
      chooseUrl: "Alleen deze URL",
      chooseDomain: "Heel domein",
      cancel: "Annuleren",
      emptyList: "Nog geen URL’s geblokkeerd.",
      remove: "Verwijder",
      blacklistHint:
        "Typ + Toevoegen, of blokkeer de huidige tab en kies URL of domein.",
      noTabUrl: "Geen actieve tab-URL gevonden.",
      cannotBlock:
        "Deze pagina kan niet geblacklist (chrome:// of interne pagina).",
      tabReadError: "Kon tab niet lezen: {err}",
      entryYoutube: "YouTube-video ({id})",
      entryDomain: "Domein: {domain}",

      urlCheck: "URL check",
      configUrlLabel: "Remote config-URL (optioneel)",
      configLoading: "Config laden…",
      configStatus: "Config v{v} · bron: {s} · {t}",
      configStatusError: " · fout: {err}",
      configUnavailable: "Config-status niet beschikbaar.",
      checkNow: "Nu controleren",
      checking: "Controleren…",
      checkOk: "OK · bron: {s} · v{v}",
      checkFailed: "Mislukt: {err} (fallback actief)",
      swUnreachable: "Service worker niet bereikbaar",
      unknownError: "onbekend",
      urlCheckHint:
        "Optioneel: remote selectors bijwerken. Zonder URL blijft de ingebouwde config actief.",
    },

    de: {
      langLabel: "Sprache",
      langAuto: "Automatisch (Browsersprache)",
      enabled: "Breitbild an",

      tabBusy: "Aktueller Tab: wird geprüft…",
      tabUnknown: "Aktueller Tab: unbekannt (Seite nach dem Update neu laden)",
      tabNoPlayer: "Aktueller Tab: kein Player gefunden",
      tabLine: "Aktueller Tab: {type} · {why}",
      whyActive: "Breitbild aktiv",
      whyOff: "Erweiterung aus",
      whyBlacklisted: "auf der Sperrliste",
      whyType: "dieser Playertyp ist aus",
      whyFsOnly: "nur im Vollbild",
      whyInactive: "derzeit nicht aktiv",

      types: "Playertypen",
      typesOff: "Playertypen ({n} aus)",
      typesOffOne: "Playertypen (1 aus)",
      typeNative: "Nativ (mp4 / direkte Quelle)",
      typeMse: "MSE (YouTube, meistes Streaming)",
      typeDrm: "DRM (Netflix, Prime, geschützt)",
      typeEmbed: "Iframe-Embed (Player im Frame)",
      typeBadge: "dieser Tab",
      typesHint:
        "Ein abgewählter Typ bekommt nie Breitbild, auf keiner Seite. Ein Typ pro Video, in dieser Reihenfolge: DRM → Iframe-Embed → MSE → nativ.",

      blacklist: "URL-Sperrliste",
      blacklistN: "URL-Sperrliste ({n})",
      blacklistPlaceholder: "Domain oder URL, z. B. example.com",
      add: "Hinzufügen",
      blockCurrent: "Aktuelle Seite sperren",
      blockWhat: "Was soll gesperrt werden?",
      blockUrlLine: "Nur diese URL: {url}",
      blockDomainLine: "Ganze Domain: {domain}",
      chooseUrl: "Nur diese URL",
      chooseDomain: "Ganze Domain",
      cancel: "Abbrechen",
      emptyList: "Noch keine URLs gesperrt.",
      remove: "Entfernen",
      blacklistHint:
        "Eintippen und Hinzufügen, oder den aktuellen Tab sperren und URL oder Domain wählen.",
      noTabUrl: "Keine URL des aktiven Tabs gefunden.",
      cannotBlock:
        "Diese Seite kann nicht gesperrt werden (chrome:// oder interne Seite).",
      tabReadError: "Tab konnte nicht gelesen werden: {err}",
      entryYoutube: "YouTube-Video ({id})",
      entryDomain: "Domain: {domain}",

      urlCheck: "URL-Prüfung",
      configUrlLabel: "Remote-Config-URL (optional)",
      configLoading: "Config wird geladen…",
      configStatus: "Config v{v} · Quelle: {s} · {t}",
      configStatusError: " · Fehler: {err}",
      configUnavailable: "Config-Status nicht verfügbar.",
      checkNow: "Jetzt prüfen",
      checking: "Wird geprüft…",
      checkOk: "OK · Quelle: {s} · v{v}",
      checkFailed: "Fehlgeschlagen: {err} (Fallback aktiv)",
      swUnreachable: "Service Worker nicht erreichbar",
      unknownError: "unbekannt",
      urlCheckHint:
        "Optional: Remote-Selektoren aktualisieren. Ohne URL bleibt die eingebaute Config aktiv.",
    },

    fr: {
      langLabel: "Langue",
      langAuto: "Automatique (langue du navigateur)",
      enabled: "Plein format activé",

      tabBusy: "Onglet actuel : vérification…",
      tabUnknown: "Onglet actuel : inconnu (rechargez la page après la mise à jour)",
      tabNoPlayer: "Onglet actuel : aucun lecteur trouvé",
      tabLine: "Onglet actuel : {type} · {why}",
      whyActive: "plein format actif",
      whyOff: "extension désactivée",
      whyBlacklisted: "sur la liste noire",
      whyType: "ce type de lecteur est désactivé",
      whyFsOnly: "plein écran uniquement",
      whyInactive: "inactif pour le moment",

      types: "Types de lecteur",
      typesOff: "Types de lecteur ({n} désactivés)",
      typesOffOne: "Types de lecteur (1 désactivé)",
      typeNative: "Natif (mp4 / source directe)",
      typeMse: "MSE (YouTube, la plupart du streaming)",
      typeDrm: "DRM (Netflix, Prime, protégé)",
      typeEmbed: "Iframe intégrée (lecteur dans un cadre)",
      typeBadge: "cet onglet",
      typesHint:
        "Un type décoché ne reçoit jamais le plein format, sur aucun site. Un type par vidéo, dans cet ordre : DRM → iframe intégrée → MSE → natif.",

      blacklist: "Liste noire d’URL",
      blacklistN: "Liste noire d’URL ({n})",
      blacklistPlaceholder: "domaine ou URL, par ex. example.com",
      add: "Ajouter",
      blockCurrent: "Bloquer la page actuelle",
      blockWhat: "Que voulez-vous bloquer ?",
      blockUrlLine: "Cette URL uniquement : {url}",
      blockDomainLine: "Tout le domaine : {domain}",
      chooseUrl: "Cette URL uniquement",
      chooseDomain: "Tout le domaine",
      cancel: "Annuler",
      emptyList: "Aucune URL bloquée pour l’instant.",
      remove: "Supprimer",
      blacklistHint:
        "Saisissez puis Ajouter, ou bloquez l’onglet actuel et choisissez URL ou domaine.",
      noTabUrl: "Aucune URL d’onglet actif trouvée.",
      cannotBlock:
        "Cette page ne peut pas être bloquée (chrome:// ou page interne).",
      tabReadError: "Impossible de lire l’onglet : {err}",
      entryYoutube: "Vidéo YouTube ({id})",
      entryDomain: "Domaine : {domain}",

      urlCheck: "Vérification d’URL",
      configUrlLabel: "URL de config distante (facultatif)",
      configLoading: "Chargement de la config…",
      configStatus: "Config v{v} · source : {s} · {t}",
      configStatusError: " · erreur : {err}",
      configUnavailable: "Statut de la config indisponible.",
      checkNow: "Vérifier maintenant",
      checking: "Vérification…",
      checkOk: "OK · source : {s} · v{v}",
      checkFailed: "Échec : {err} (repli actif)",
      swUnreachable: "Service worker injoignable",
      unknownError: "inconnu",
      urlCheckHint:
        "Facultatif : mettre à jour les sélecteurs distants. Sans URL, la config intégrée reste active.",
    },

    es: {
      langLabel: "Idioma",
      langAuto: "Automático (idioma del navegador)",
      enabled: "Pantalla ancha activada",

      tabBusy: "Pestaña actual: comprobando…",
      tabUnknown: "Pestaña actual: desconocida (recarga la página tras actualizar)",
      tabNoPlayer: "Pestaña actual: no se encontró reproductor",
      tabLine: "Pestaña actual: {type} · {why}",
      whyActive: "pantalla ancha activa",
      whyOff: "extensión desactivada",
      whyBlacklisted: "en la lista negra",
      whyType: "este tipo de reproductor está desactivado",
      whyFsOnly: "solo en pantalla completa",
      whyInactive: "ahora mismo no está activa",

      types: "Tipos de reproductor",
      typesOff: "Tipos de reproductor ({n} desactivados)",
      typesOffOne: "Tipos de reproductor (1 desactivado)",
      typeNative: "Nativo (mp4 / fuente directa)",
      typeMse: "MSE (YouTube, la mayoría del streaming)",
      typeDrm: "DRM (Netflix, Prime, protegido)",
      typeEmbed: "Iframe incrustado (reproductor en un marco)",
      typeBadge: "esta pestaña",
      typesHint:
        "Un tipo desmarcado nunca recibe pantalla ancha, en ningún sitio. Un tipo por vídeo, en este orden: DRM → iframe incrustado → MSE → nativo.",

      blacklist: "Lista negra de URL",
      blacklistN: "Lista negra de URL ({n})",
      blacklistPlaceholder: "dominio o URL, p. ej. example.com",
      add: "Añadir",
      blockCurrent: "Bloquear la página actual",
      blockWhat: "¿Qué quieres bloquear?",
      blockUrlLine: "Solo esta URL: {url}",
      blockDomainLine: "Todo el dominio: {domain}",
      chooseUrl: "Solo esta URL",
      chooseDomain: "Todo el dominio",
      cancel: "Cancelar",
      emptyList: "Todavía no hay URL bloqueadas.",
      remove: "Eliminar",
      blacklistHint:
        "Escribe y pulsa Añadir, o bloquea la pestaña actual y elige URL o dominio.",
      noTabUrl: "No se encontró la URL de la pestaña activa.",
      cannotBlock:
        "Esta página no se puede bloquear (chrome:// o página interna).",
      tabReadError: "No se pudo leer la pestaña: {err}",
      entryYoutube: "Vídeo de YouTube ({id})",
      entryDomain: "Dominio: {domain}",

      urlCheck: "Comprobación de URL",
      configUrlLabel: "URL de config remota (opcional)",
      configLoading: "Cargando config…",
      configStatus: "Config v{v} · fuente: {s} · {t}",
      configStatusError: " · error: {err}",
      configUnavailable: "Estado de la config no disponible.",
      checkNow: "Comprobar ahora",
      checking: "Comprobando…",
      checkOk: "OK · fuente: {s} · v{v}",
      checkFailed: "Falló: {err} (respaldo activo)",
      swUnreachable: "Service worker inaccesible",
      unknownError: "desconocido",
      urlCheckHint:
        "Opcional: actualizar selectores remotos. Sin URL sigue activa la config integrada.",
    },
  };

  /** Dropdown order; "auto" is prepended by the popup. */
  const LOCALES = Object.keys(MESSAGES);

  const LOCALE_NAMES = {
    en: "English",
    nl: "Nederlands",
    de: "Deutsch",
    fr: "Français",
    es: "Español",
  };

  function browserLocale() {
    let tag = "";
    try {
      tag = chrome.i18n?.getUILanguage?.() || "";
    } catch {
      tag = "";
    }
    if (!tag) tag = navigator.language || "";
    const primary = String(tag).toLowerCase().split("-")[0];
    return MESSAGES[primary] ? primary : FALLBACK;
  }

  /** "auto" or an unknown code resolves to the browser language. */
  function resolveLocale(pref) {
    const code = String(pref || "auto").toLowerCase();
    if (code !== "auto" && MESSAGES[code]) return code;
    return browserLocale();
  }

  function fill(text, vars) {
    if (!vars) return text;
    return text.replace(/\{(\w+)\}/g, (match, name) =>
      Object.prototype.hasOwnProperty.call(vars, name)
        ? String(vars[name])
        : match
    );
  }

  function t(key, vars, locale) {
    const code = resolveLocale(locale);
    const text =
      MESSAGES[code]?.[key] ?? MESSAGES[FALLBACK]?.[key] ?? key;
    return fill(text, vars);
  }

  function localeName(code) {
    return LOCALE_NAMES[code] || code;
  }

  /**
   * Translate static markup: data-i18n (text), data-i18n-placeholder,
   * data-i18n-title.
   */
  function applyDom(root, locale) {
    const scope = root || document;
    scope.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n, null, locale);
    });
    scope.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      el.placeholder = t(el.dataset.i18nPlaceholder, null, locale);
    });
    scope.querySelectorAll("[data-i18n-title]").forEach((el) => {
      el.title = t(el.dataset.i18nTitle, null, locale);
    });
  }

  return {
    MESSAGES,
    LOCALES,
    LOCALE_NAMES,
    FALLBACK,
    browserLocale,
    resolveLocale,
    localeName,
    t,
    applyDom,
  };
})();
