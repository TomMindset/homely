# Homely Website-Entwurf

Uebergangs-Domain fuer GitHub Pages: `aesti.de`

Finale Domain spaeter: `homely-haushaltsmanager.de`

Stand: 2026-07-07

Diese statische Website ist fuer Google Play und den spaeteren Store-Auftritt von **Homely: Haushalts Manager** vorbereitet.

## Ziel-URLs fuer Google Play

- Startseite: `https://aesti.de/`
- Datenschutz: `https://aesti.de/datenschutz`
- Kontoloeschung: `https://aesti.de/konto-loeschen`
- Impressum: `https://aesti.de/impressum`

Je nach Hosting koennen die Dateien als `.html` ausgeliefert oder per Rewrite ohne `.html` erreichbar gemacht werden.

## Dateien

- `index.html`: Produkt-/Startseite
- `datenschutz.html`: Datenschutzerklaerung
- `konto-loeschen.html`: Google-Play-Kontoloeschseite
- `impressum.html`: Impressum
- `styles.css`: gemeinsames Styling
- `assets/homely-icon.png`: Homely Logo/Icon
- `_redirects`: Netlify-Rewrites fuer saubere URLs
- `netlify.toml`: Netlify-Konfiguration
- `vercel.json`: Vercel-Konfiguration
- `robots.txt`: Suchmaschinenfreigabe
- `sitemap.xml`: Sitemap fuer die Ziel-Domain

## Live-Stand

- Anbieter: Thomas Hoffmann
- Anschrift: Gress-Straße 1, 71384 Weinstadt
- Kontakt fuer Datenschutz, Support und Kontoloeschung: hoffmann.thomas@gmx.de
- Kontoloesch-Anfragen werden in der Regel innerhalb von 7 Tagen bearbeitet.

## Hosting-Optionen

- Eigener Webhoster mit Domain
- GitHub Pages plus Custom Domain
- Netlify/Vercel plus Custom Domain
- Statischer Host mit HTTPS und Redirects

## Google Play

In der Play Console spaeter eintragen:

- Datenschutz-URL: `https://aesti.de/datenschutz`
- Account-Deletion-URL: `https://aesti.de/konto-loeschen`

Die App bietet zusaetzlich eine In-App-Kontoloeschung unter:

`Mehr > Konto > Daten & Loeschung > Konto loeschen`

## Lokale Vorschau

Die Dateien koennen direkt im Browser geoeffnet werden. Fuer saubere Pfade wie `/datenschutz` braucht es spaeter ein Hosting mit Rewrite-Unterstuetzung, z. B. Netlify oder Vercel.
