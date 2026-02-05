# Dashboard (GitHub Pages) — układ v2

## Układ
- Góra: Pogoda • Radio • Ulubione
- Dół: Newsy (domyślnie zakładka Sport)

## Jak uruchomić na GitHub Pages
1. Utwórz repo (np. `dashboard` albo `twojlogin.github.io`).
2. Wrzuć pliki: `index.html`, `styles.css`, `config.js`, `app.js`, `README.md`.
3. Settings → Pages → Deploy from a branch → `main` (root).

## Konfiguracja
Edytuj `config.js`:
- `placeLabel`, `lat`, `lon` – pogoda
- `rss.news`, `rss.sport` – RSS
- `stations` – lista stacji
- `quicklinks` – skróty
