# Slovenska Književnost: Tehnični Standard

> Ta dokument je uradna tehnična referenca za vse razvijalce (ljudi in LLM modele),
> ki bodo kadar koli v prihodnosti delali s to kodno bazo. Preberi ga v celoti,
> preden narediš kakršno koli spremembo.

---

## 0. Pregled Aplikacije

**Slovenska književnost** je progresivna spletna aplikacija (PWA) za branje slovenske poezije in proze. Uporabnik izbere avtorja (Prešeren, Cankar, Gregorčič, Kette ...), brska po zbirkah in bere posamezna dela. Aplikacija je v celoti napisana v **čistem (Vanilla) HTML, CSS in JavaScript** — brez ogrodij, brez prevajalnikov, brez build koraka.

### 0.1 Datotečna Struktura

```
2026-03-11-slovenska-knjizevnost/
├── index.html                  # Edina HTML stran (SPA)
├── manifest.json               # PWA manifest
├── sw.js                       # Service Worker (ES Module)
├── README.md                   # Osnovni opis projekta
├── css/
│   ├── app.css                 # Vstopna CSS datoteka (@import hub)
│   ├── variables.css           # Design tokeni, reset, barvne teme
│   ├── base.css                # Tipografija, body, globalni stili
│   ├── main-components.css     # Kartice, navigacija, pesmi, animacije
│   ├── search.css              # Globalni iskalnik (overlay)
│   ├── settings-modal.css      # Stranski panel z nastavitvami
│   ├── google-fonts-local.css  # @font-face deklaracije za lokalne pisave
│   └── fonts/                  # woff2 pisave (Cinzel, Lora, Inter, EB Garamond ...)
├── js/
│   ├── main.js                 # Vstopna točka — inicializacija vseh modulov
│   ├── version.js              # Centralna verzija aplikacije (za SW cache key)
│   ├── modules/
│   │   ├── router.js           # Hash-based SPA routing in prikaz pesmi
│   │   ├── Renderer.js         # Vsa DOM manipulacija (izris pogledov)
│   │   ├── data.js             # Nalaganje, sortiranje in cache JSON pesmi
│   │   ├── AuthorManager.js    # Nalaganje in upravljanje avtorjev iz authors.json
│   │   ├── StorageManager.js   # IndexedDB + localStorage abstakcija
│   │   ├── settings.js         # Nastavitve UI (tema, pisave, velikosti, barve)
│   │   ├── GlobalSearch.js     # Globalno iskanje po avtorjih in delih
│   │   ├── GlobalEvents.js     # Centralizirani globalni DOM eventi
│   │   ├── ShareManager.js     # Web Share API + kopiranje + delitev
│   │   ├── TTSManager.js       # Text-to-Speech branje pesmi (Web Speech API)
│   │   ├── Favorites.js        # Priljubljene pesmi (localStorage)
│   │   ├── BookmarkManager.js  # Zaznamki s scroll pozicijo
│   │   ├── HistoryManager.js   # Zgodovina branja (zadnjih 12 pesmi)
│   │   ├── LastRead.js         # "Nadaljuj z branjem" hero sekcija
│   │   ├── Highlighter.js      # Označevanje besedila v pesmih (IndexedDB)
│   │   ├── GestureManager.js   # Touch/swipe geste za mobilno navigacijo
│   │   ├── SEOManager.js       # Dinamični OG meta tagi in JSON-LD
│   │   ├── PWAManager.js       # PWA install prompt in upravljanje
│   │   └── utils.js            # escapeHtml, debounce, keyboard nav, focus trap
│   └── workers/
│       └── SearchWorker.js     # Web Worker za iskanje po pesemski vsebini
├── json/
│   ├── authors.json            # Register avtorjev (ime, obdobje, datoteke)
│   ├── preseren.json           # Pesmi France Prešerna
│   ├── cankar.json             # Dela Ivana Cankarja (~6.8 MB)
│   ├── gregorcic.json          # Pesmi Simona Gregorčiča
│   └── kette.json              # Pesmi Dragotina Ketteja
└── img/
    ├── authors/                # Portreti avtorjev (WebP format)
    └── branding/               # Favicon in PWA ikone (SVG)
```

---

## 1. HTML Standardi

### 1.1 SPA Arhitektura (Hash Routing)

Aplikacija ima **eno samo HTML datoteko** (`index.html`). Navigacija poteka prek URL hash-a:

| Hash | Pogled |
|---|---|
| `#` (prazen) | Portal — mreža avtorjev |
| `#preseren` | Zbirka del za izbranega avtorja |
| `#preseren/3` | Posamezna pesem (ID 3) |
| `#favorites` | Seznam priljubljenih pesmi |
| `#bookmarks` | Seznam zaznamkov |

Router (`router.js`) posluša `hashchange` dogodek in sproži ustrezno prikazno funkcijo v `Renderer.js`.

### 1.2 Sistem Predlog (`<template>`)

Aplikacija obsežno uporablja **nativni `<template>` element** za večkrat ponovljene DOM strukture. V HTML je definiranih **13 predlog**:

| ID Predloge | Namen |
|---|---|
| `tpl-author-card` | Kartica avtorja na portalu |
| `tpl-poem-item` | Posamezna vrstica v seznamu pesmi |
| `tpl-poem-header` | Naslov zbirke (H2 ločilnik) |
| `tpl-poem-subgroup-header` | Naslov podzbirke (H3 ločilnik) |
| `tpl-inline-search` | Iskalno polje znotraj seznama pesmi |
| `tpl-poem-view` | Celotna struktura pogleda pesmi (akcije, TTS, vsebina) |
| `tpl-fav-item` | Vrstica v seznamu priljubljenih |
| `tpl-bookmark-item` | Vrstica v seznamu zaznamkov |
| `tpl-history-item` | Kartica v "Nedavno prebrano" vrstici |
| `tpl-search-author` | Rezultat iskanja: avtor |
| `tpl-search-group` | Rezultat iskanja: zbirka |
| `tpl-search-poem` | Rezultat iskanja: pesem |
| `tpl-skeleton-list` / `tpl-skeleton-poem` | Skeleton loadingji med nalaganjem |
| `tpl-period-pill` | Tableta za filtriranje po obdobjih |

**Uporaba v JS**: `template.content.cloneNode(true)` → izpolni z dejanskimi podatki → `container.appendChild(clone)`.

### 1.3 Ikone (Inline SVG)

Aplikacija **ne** uporablja FontAwesome ali zunanjih ikon knjižnic. Vse ikone so **ročno vgrajene SVG** elementi neposredno v HTML. To zagotavlja:
- Nič zunanjih zahtev za ikone
- Mogoče barvanje prek `currentColor` in CSS
- Manjša velikost končnega paketa

### 1.4 Dostopnost (A11y)

- Vsi gumbi z ikonami imajo `aria-label` (npr. `aria-label="Nastavitve branja"`, `aria-label="Išči"`)
- Dekorativne SVG ikone imajo `aria-hidden="true"`
- Funkcijske SVG ikone imajo `role="img"` in `aria-label`
- Nastavitve uporabljajo `role="group"` za segmentirane kontrole (tema, poravnava)
- `aria-expanded` na akordeonskih gumbih (`.section-toggle`)
- Iskalno polje ima `aria-label="Globalno iskanje"`
- Glavni vsebinski blok (`#main-content`) ima `aria-live="polite"` za dinamične posodobitve
- **Focus Trap** (`utils.js → createFocusTrap()`) za modalna okna nastavitev — Tab/Shift+Tab kroži znotraj panela

### 1.5 SEO (Dinamični Meta Podatki)

Modul `SEOManager.js` dinamično posodablja:
- `<title>` — ime pesmi ali avtorja
- `<meta name="description">` — kratka vsebina
- `<meta property="og:*">` — Open Graph za deljenje na socialnih omrežjih
- `<script type="application/ld+json">` — JSON-LD strukturirani podatki (Schema.org `CreativeWork`, `CollectionPage`)

### 1.6 Strogo Prepovedano

- **Inline stili** (`style=""`) v HTML: prepovedani, razen v skeleton loadingjih (širine za naravni videz utripanja)
- **Inline skripte**: prepovedane. Izjema je `onclick` na "Nadaljuj z branjem" gumbu, ki nastavi `window.location.hash`

---

## 2. CSS Standardi

### 2.1 Modularna Arhitektura

CSS je razdeljen v **7 datotek**, uvoženih prek centralne `app.css`:

```css
@import './google-fonts-local.css';   /* 1. Pisave */
@import 'variables.css';              /* 2. Reset, tokeni, teme */
@import 'base.css';                   /* 3. Globalni: body, tipografija */
@import 'main-components.css';        /* 4. Kartice, navigacija, pesmi */
@import 'search.css';                 /* 5. Iskalnik */
@import 'settings-modal.css';         /* 6. Nastavitve panel */
```

### 2.2 Barvni Sistem (OKLCH)

Celoten barvni sistem temelji na **OKLCH** barvnem prostoru — sodoben CSS standard za percepcijsko enotne barve:

```css
--bg-color: oklch(100.0% 0.0001 261.71);       /* Bela */
--text-color: oklch(0.0% 0.0 0.0);              /* Črna */
--item-hover: oklch(55.69% 0.0474 44.06 / 0.15); /* S alpha kanalom */
```

**Razlog**: OKLCH zagotavlja enakomerne svetlostne razlike med barvami, kar je ključno za dostopnostne teme (protanopija, tritanopija).

### 2.3 Tema Sistem (Data Atributi)

Teme se preklapljajo prek atributa `data-theme` na `<body>`:

```html
<body data-theme="dark">
```

Definirane teme in njihov namen:

| Tema | CSS Selektor | Namen |
|---|---|---|
| Svetla | `:root` (Default) | Bela podlaga, črno besedilo |
| Temna | `[data-theme="dark"]` | Črna podlaga, belo besedilo |
| Sepija | `[data-theme="sepia"]` | Toplo rumena, rjavo besedilo (bralniški način) |
| Nord | `[data-theme="nord"]` | Polarni modri toni (Nord paleta) |
| Protanopija | `[data-theme="protanopia"]` | Brez rdečih tonov (slabovidni) |
| Tritanopija | `[data-theme="tritanopia"]` | Brez modrih tonov (slabovidni) |
| Po meri | `[data-theme="custom"]` | Uporabnik izbere vse barve sam |

Tema "Po meri" nastavlja barve prek CSS spremenljivk neposredno z JavaScript `setProperty()`.

### 2.4 Pisave (Lokalne, Offline-First)

Vse pisave so naložene lokalno iz `css/fonts/`. Uporabljene pisave:

| Pisava | Vloga | CSS spremenljivka |
|---|---|---|
| **Cinzel** | Naslovi literarnih del | `--header-font` |
| **Open Sans** | Telo besedila | `--body-font` |
| **Inter** | UI elementi (gumbi, meniji) | `--ui-font` |
| **Lora** | Alternativa za naslove/telo |
| **EB Garamond** | Klasična serifna alternativa |
| **Playfair Display** | Premium serifna alternativa |
| **Roboto Mono** | Monospace alternativa |
| **Georgia** | Sistemska serifna (ni v fonts/) |

Uporabnik lahko v nastavitvah **neodvisno** izbere pisavo za naslove in telo besedila. Prav tako lahko prilagodi velikost, razmik vrstic in poravnavo.

### 2.5 Globalni Reset

CSS reset uporablja moderno `:where()` tehniko za ničelno specifičnost:

```css
:where(*, *::before, *::after) {
    box-sizing: border-box;
    margin-block: 0;
    margin-inline: 0;
    padding-block: 0;
    padding-inline: 0;
}
```

Uporaba **logičnih lastnosti** (`margin-block`, `padding-inline`, `inline-size`) je standard za prihodnost (podpora RTL jezikom).

### 2.6 Trije Ločeni CSS Konteksti za Pisave

Aplikacija ločuje tri tipografske kontekste:
1. **`--header-font`** — naslovi (h1, h2, h3 v pesmi)
2. **`--body-font`** — vsebina pesmi (telo besedila)
3. **`--ui-font`** — gumbi, nastavitve, navigacija — **vedno Inter/Open Sans**, ker ta ne sme slediti uporabniški izbiri pisave

---

## 3. JavaScript Arhitektura

### 3.1 Modularni Sistem (ES6 Modules)

Vsa koda je organizirana v ES6 module z `import/export`. Vstopna točka je `js/main.js`.

**Inicializacijski vrstni red** (kritičen!):
1. `initSettings()` — Naloži in aplicira temo/pisave (mora biti před renderiranjem)
2. `initRouter()` — Hash routing, začetni render portala ali pesmi
3. `GlobalSearch.init()` — Registrira iskalne evente
4. `LastRead.initAutoSave()` — Samodejno shranjevanje pozicije branja
5. `GestureManager.init()` — Swipe geste za mobilno navigacijo
6. `Highlighter.init()` — Označevanje teksta
7. `GlobalEvents.init()` — Centralizirani DOM event listenerji
8. `PWAManager.init()` — PWA install prompt

### 3.2 Renderer (DOM Abstrakcija)

**Vsa DOM manipulacija** je centralizirana v enem samem objektu: `Renderer.js`.
Nobena druga komponenta ne sme neposredno pisati v DOM.

Renderer nudi metode:
- `switchView('PORTAL' | 'COLLECTION')` — preklopi pogled
- `updateHeader(author, mode)` — posodobi sliko in naslov
- `renderAuthorGrid(authors, template)` — izriše mrežo avtorjev
- `renderPoemList(authorId, poems, label, isGroupSort)` — izriše seznam pesmi
- `renderPoem(poem, isFav, ttsRate, isBookmarked)` — izriše posamezno pesem
- `renderFavorites(favs, authors, onRemove)` — izriše priljubljene
- `renderBookmarks(bookmarks, authors, onRemove)` — izriše zaznamke
- `renderHistory(history)` — izriše vodoravno vrstico nedavno prebranih
- `renderSearchResults(results, onAuthorClick, onClose)` — izriše rezultate iskanja
- `renderListSkeleton()` / `renderPoemSkeleton()` — skeleton loading stanja

### 3.3 Podatkovni Tok (Data Flow)

```
authors.json → AuthorManager → Router → data.js (fetch + sort) → Renderer
                                                    ↓
                                              IndexedDB cache
```

1. `AuthorManager` ob odprtem portalu naloži `json/authors.json` in pripravi register
2. Ob kliku na avtorja `Router` pokliče `data.js → fetchPoems(jsonPath)`
3. `fetchPoems` najprej preveri **IndexedDB cache** (preprečuje ponovne mrežne zahteve)
4. Če cache ne obstaja, naredi `fetch()` in shrani rezultat nazaj v IndexedDB
5. Router pokliče `Renderer.renderPoemList()` ali `Renderer.renderPoem()`

### 3.4 Hybridno Shranjevanje (LocalStorage + IndexedDB)

`StorageManager.js` združuje obe shranjevalni strategiji:

| Podatki | Shramba | Razlog |
|---|---|---|
| Nastavitve (tema, pisave, velikosti) | `localStorage` | Majhni podatki, sinhroni dostop |
| Priljubljene pesmi | `localStorage` | Majhen JSON array |
| Zgodovina branja | `localStorage` | Majhen JSON array (max 12 zapisov) |
| Zaznamki | `localStorage` | Majhen JSON array |
| Zadnje branje (Last Read) | `localStorage` | En sam objekt |
| **Pesemski podatki (cache)** | `IndexedDB` | Velike JSON datoteke (do 6.8 MB za Cankarja) |
| **Označevanje (highlights)** | `IndexedDB` | Kompleksni podatki po pesmih |

Cache pesemskih podatkov ima **7-dnevni TTL** (Time To Live). Modul `clearExpiredCache()` čisti zastarele zapise.

### 3.5 Iskanje (Web Worker)

Globalno iskanje po vsebini pesmi poteka v **ločeni niti** (Web Worker: `SearchWorker.js`), da ne blokira UI.

**Postopek**:
1. Uporabnik vpiše iskalni niz v globalni iskalnik
2. `GlobalSearch.js` sproži `postMessage()` na `SearchWorker`
3. Worker prebere vse pesemske datoteke in poišče zadetke
4. Worker vrne rezultate prek `onmessage`
5. `Renderer.renderSearchResults()` izriše zadetke

### 3.6 Text-to-Speech (TTS)

Modul `TTSManager.js` uporablja **Web Speech API** (`SpeechSynthesisUtterance`) za glasno branje pesmi.

Funkcionalnosti:
- Branje posameznih besed s sledilnikom (aktivna beseda je označena s CSS razredom `.tts-word.active`)
- Uporabnik lahko klikne na besedo za skok na ta del
- Nastavitev hitrosti (rate: 0.5–2.0×) s stepper gumbi
- Pavza/nadaljevanje/ustavitev
- Ob menjavi poti (route change) se TTS samodejno ustavi

### 3.7 Geste (Mobile Touch)

`GestureManager.js` posluša `touchstart`/`touchmove`/`touchend` na vsebinskem bloku in omogoča:
- **Swipe levo** → naslednja pesem
- **Swipe desno** → prejšnja pesem
- Minimalna dolžina premika: 50px (preprečuje lažne sprožitve ob navadnem scrollu)

### 3.8 Drag-to-Scroll na "Nedavno prebrano"

Vrstica "Nedavno prebrano" na portalu ima mouse-based drag-to-scroll. `Renderer.renderHistory()` veže `mousedown`, `mousemove`, `mouseup` za simulacijo vodoravnega scroll-a z miško. Ključno: `dragged` zastavica prepreči nenamerno klikanje med vlečenjem.

### 3.9 XSS Zaščita

Vsa uporabniška vsebina (naslovi pesmi, vsebina) se pred vstavitvijo v DOM razšči prek `escapeHtml()`:

```js
export function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
```

### 3.10 Pomožni Vzorci

| Vzorec | Modul | Namen |
|---|---|---|
| `debounce(fn, ms)` | `utils.js` | Zakasnitev izvajanja ob hitrem tipkanju (iskanje) |
| `setupKeyboardNav(input, getItems)` | `utils.js` | ↑↓ Enter navigacija na seznamu zadetkov |
| `createFocusTrap(element)` | `utils.js` | Tab/Shift+Tab kroži znotraj modalnega panela |
| Skeleton Loading | `Renderer.js` | Takojšen izris okostnjakov pred nalaganjem podatkov |
| Stale-While-Revalidate | `sw.js`, `data.js` | Takoj prikaži cache, nato tiho osveži |

### 3.11 Strogo Prepovedano v JS

- `var` ključna beseda — nikoli (samo `const` in `let`)
- Direktno DOM pisanje izven `Renderer.js` — nikoli (razen `router.js → showToast`)
- `innerHTML` z nevalidiranim uporabniškim vnosom — nikoli (vedno `escapeHtml()`)
- `document.write()` — nikoli
- Direktno pisanje v `localStorage` mimo `StorageManager` (za nastavitve) — vedno prek `StorageManager.saveSetting()`

---

## 4. Baza Podatkov (IndexedDB)

### 4.1 Sheme

| Object Store | Primarni Ključ | Vsebina |
|---|---|---|
| `poems_cache` | `id` (authorId) | Celoten JSON array pesmi za enega avtorja + timestamp |
| `highlights` | `id` (poemId) | Array oznak (highlights) za eno pesem + timestamp |

### 4.2 Cache Strategija

- Ob prvem odprtju avtorja → `fetch()` JSON → shrani v `poems_cache`
- Ob naslednjem odprtju → `poems_cache` → takojšen izris (brez omrežja)
- Expired cache (starejši od 7 dni) se počisti z `clearExpiredCache()`
- Uporabnik ima v nastavitvah gumb **"Prenesi vse podatke"**, ki vnaprej naloži vse JSON datoteke za offline branje

---

## 5. PWA in Offline-First

### 5.1 Service Worker (`sw.js`)

Service Worker je registriran kot **ES Module** (`{ type: 'module' }`), kar omogoča uvoz `APP_VERSION` iz `version.js`.

**Cache ime**: `slovenska-knjizevnost-v{APP_VERSION}`

### 5.2 Strategije Nalaganja

| Vrsta Vira | Strategija | Razlog |
|---|---|---|
| JSON (pesmi) | **Stale-While-Revalidate** | Takojšen prikaz + osvežitev v ozadju |
| App Shell (JS, CSS, HTML) | **Stale-While-Revalidate** | Takojšen prikaz + osvežitev v ozadju |
| Pisave in slike | **Cache-First** | Statični viri, redke spremembe |
| Vse ostalo | **Cache-First** | Fallback strategija |

### 5.3 Posodobitve

Ob zaznavi nove verzije:
1. `main.js` zazna `updatefound` na registraciji
2. Prikaže se toast z gumbom "Osveži"
3. Klik sproži `postMessage({ type: 'SKIP_WAITING' })` na novem SW
4. `controllerchange` sproži `location.reload()`
5. Periodično preverjanje posodobitev vsakih 30 minut (`setInterval`)

### 5.4 Manifest

| Polje | Vrednost |
|---|---|
| `name` | Slovenska književnost |
| `display` | `standalone` |
| `orientation` | `portrait-primary` |
| `lang` | `sl` |
| `start_url` | `./` |
| `theme_color` | `#ffffff` |

---

## 6. Nastavitve Uporabnika

Aplikacija nudi **bogat nabor nastavitev**, ki se shranjujejo v `localStorage`:

| Nastavitev | Ključ | Privzeto | Možnosti |
|---|---|---|---|
| Barvna tema | `theme` | `light` | light, dark, sepia, nord, protanopia, tritanopia, custom |
| Pisava naslovov | `headingFont` | `cinzel` | cinzel, georgia, lora, playfair, eb-garamond, roboto-mono, open-sans, inter |
| Pisava besedila | `bodyFont` | `open-sans` | enake kot zgoraj |
| Velikost naslovov | `headingFontSize` | `32` | 20–60 px |
| Velikost besedila | `fontSize` | `26` | 16–40 px |
| Razmik vrstic naslovov | `headingLineHeight` | `1.3` | 1.0–2.5 |
| Razmik vrstic besedila | `contentLineHeight` | `1.5` | 1.0–2.5 |
| Poravnava | `align` | `center` | left, center, right, justify |
| Širina vsebine | `contentWidth` | `100` | 20–100 % |
| Prikaži vrstico z ukrepi | `showDock` | `true` | true/false |
| Prikaži priljubljene v vrstici | `showDockFav` | `true` | true/false |
| Prikaži deli v vrstici | `showDockShare` | `true` | true/false |
| Prikaži TTS v vrstici | `showDockTTS` | `true` | true/false |
| Prikaži zaznamke v vrstici | `showDockBookmark` | `true` | true/false |
| Hitrost TTS | `ttsRate` | `1.0` | 0.5–2.0 |
| Barve po meri | `customBg`, `customTextColor`, `customHeadingColor`, `customIconColor`, `customAccentColor` | različne | hex barve |

Vsaka sprememba se **takoj uporabi** prek CSS spremenljivk na `:root` ali `body` elementu in takoj shrani.

---

## 7. Dogovori za Imenovanje

| Element | Konvencija | Primer |
|---|---|---|
| CSS razredi | `kebab-case` | `.author-card`, `.poem-actions-bar` |
| CSS spremenljivke | `--kebab-case` | `--bg-color`, `--heading-color`, `--ui-font` |
| HTML ID-ji | `kebab-case` | `#main-content`, `#settings-overlay` |
| HTML template ID-ji | `tpl-kebab-case` | `#tpl-author-card`, `#tpl-poem-view` |
| HTML data atributi | `kebab-case` | `data-theme`, `data-setting`, `data-value` |
| JS moduli | `PascalCase` | `Renderer`, `GlobalSearch`, `TTSManager` |
| JS funkcije/metode | `camelCase` | `renderPoemList()`, `handleRoute()` |
| JS utility funkcije | `camelCase` (named export) | `escapeHtml()`, `debounce()`, `createFocusTrap()` |
| JSON datoteke | `kebab-case` | `authors.json`, `preseren.json` |

---

## 8. Kontrolni Seznam za Nove Spremembe

Pred objavo kakršne koli spremembe preveri naslednje:

- [ ] Ali je bila nova datoteka dodana v `sw.js → STATIC_ASSETS` array?
- [ ] Ali je verzija aplikacije ustrezno povečana v `version.js`?
- [ ] Ali je CSS v pravilni datoteki glede na namen (variables / base / components / search / settings)?
- [ ] Ali so novi gumbi brez besedila opremljeni z `aria-label`?
- [ ] Ali so dekorativne SVG ikone označene z `aria-hidden="true"`?
- [ ] Ali so vsi uporabniški vnosi razščeni prek `escapeHtml()` pred DOM vstavitvijo?
- [ ] Ali so nastavljivi podatki shranjeni prek `StorageManager.saveSetting()`?
- [ ] Ali vsa DOM manipulacija poteka skozi `Renderer.js`?
- [ ] Ali se nove nastavitve po dodajanju samodejno uporabijo in shranijo?
- [ ] Ali so barve definirane v OKLCH formatu (razen za Nord temo, ki sledi originalni paleti)?
- [ ] Ali SVG ikone uporabljajo `currentColor` za barvanje namesto trdo kodiranih barv?
- [ ] Ali nov modul uporablja `export` in se uvozi v `main.js` ali ustrezno podkomponento?

---

*Zadnja posodobitev: 29. marec 2026*
*Verzija dokumenta: 1.0*
