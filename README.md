# 📚 Slovenska književnost — Portal poezije in proze

![PWA Ready](https://img.shields.io/badge/PWA-Ready-orange?style=for-the-badge)
![JavaScript ES6](https://img.shields.io/badge/JS-ES6+-yellow?style=for-the-badge)
![License MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

Progresivna spletna aplikacija (PWA) za branje del znanih slovenskih književnikov — Prešeren, Cankar, Gregorčič, Kette in drugi. Zasnovana z mislijo na čisto bralno izkušnjo, dostopnost in brezhibno delovanje na vseh napravah.

🔗 **[Odpri aplikacijo](https://mihaknific.github.io/slovenska-knjizevnost/)**

---

## ✨ Ključne funkcionalnosti

- **PWA (Progressive Web App)** — Namestitvena na telefon (Android/iOS) ali računalnik, deluje brez interneta.
- **Napredni tematski sistem** — Svetla, temna, Nord, sepia in možnost popolne prilagoditve barv po meri.
- **Globalno iskanje** — Hkratno iskanje po avtorjih, naslovih in vsebini del z uporabo Web Workerjev.
- **Priljubljene in zaznamki** — Shranjevanje najljubših pesmi in beleženje zadnje pozicije branja (`LastRead` modul).
- **TTS (Besedilo v govor)** — Poslušanje del z uporabo Web Speech API.
- **Interaktivni označevalnik** — Barvno označevanje verzov in deljenje citatov.

## 🛠 Tehnična arhitektura

Projekt je zasnovan kot **Single Page Application (SPA)** brez zunanjih ogrodij (Vanilla JS), kar zagotavlja izjemno hitrost in majhno porabo virov.

- **Modularni JavaScript (ES6+)** — Logika je razdeljena na specializirane module (`Router`, `Renderer`, `StorageManager`, `AuthorManager`), kar olajša vzdrževanje.
- **Hash-based Routing** — Hitra navigacija med pogledi brez osveževanja strani.
- **Offline Cache Strategy** — Uporaba `Service Worker-ja` za predpomnjenje virov (statične datoteke in JSON podatki).
- **Client-side Search Indexing** — Iskanje teče v ločeni niti (`SearchWorker`), da ne blokira uporabniškega vmesnika.

## 🧪 Zagotavljanje kakovosti (QA)

Projekt sledi visokim standardom kakovosti programske opreme:
- **Večplatformno testiranje** — Ročno preverjeno na iOS (Safari), Android (Chrome) in Desktop (Edge/Firefox) brskalnikih.
- **Responsive Design** — Preizkušeno na različnih zaslonih od 320px do ultra-širokih monitorjev.
- **Dostopnost** — Implementirani ARIA labeli in podpora za bralnike zaslona.
- **Načrtovano** — Integracija avtomatiziranih E2E testov s Cypress.

## 📂 Struktura projekta

```text
├── index.html          # Glavna vstopna točka in SPA struktura
├── css/                # Organizirani CSS moduli (base, settings, search...)
├── js/                 # Aplikacijska logika
│   ├── main.js         # Inicializacija in Service Worker registracija
│   └── modules/        # Funkcionalni moduli (Vanilla JS)
├── json/               # Strukturirani podatki o avtorjih in delih
├── img/                # Optimizirane slike (.webp format)
└── sw.js               # Logika za offline delovanje
```

## 🚀 Zagon lokalno

Aplikacijo serviraj s katerimkoli statičnim strežnikom:

```bash
# Python
python -m http.server

# VS Code
# Preprosto kliknite na "Go Live" (Live Server razširitev)
```

---
© 2026 Miha Knific — Razvito s strastjo do slovenske besede in čistega koda.
