# Dashboard (GitHub Pages)

## Jak uruchomić na GitHub Pages
1. Utwórz repo (np. `dashboard` albo `twojlogin.github.io`).
2. Wrzuć pliki: `index.html`, `styles.css`, `config.js`, `app.js`, `README.md`.
3. Wejdź w: Settings → Pages.
4. Source: Deploy from a branch.
5. Branch: `main` (root).
6. Zapisz. Po chwili dostaniesz URL do strony.

## Konfiguracja
Edytuj `config.js`:
- `placeLabel`, `lat`, `lon` – pogoda
- `rss.news`, `rss.sport` – źródła newsów (RSS)
- `stations` – lista stacji (już ustawiona pod Twoje wymagania)
- `quicklinks` – skróty

## Źródła danych
- Pogoda: Open-Meteo
- Newsy: RSS (Google News RSS przez proxy)
- Kursy walut i złoto: NBP Web API
- Srebro: Stooq (CSV) + przeliczenie po USD/PLN z NBP
- Radio: Radio-Browser API (url_resolved)
