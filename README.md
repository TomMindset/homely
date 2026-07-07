# Homely: Haushalts Manager

Homely ist eine Android-App fuer Familien, Wohngemeinschaften und Haushalte. Die App organisiert Aufgaben, Punkte, Fairness, Essensplanung, Mitgliederrollen und optionalen Supabase-Sync.

## Struktur

- `apps/mobile`: Expo/React-Native-App
- `supabase`: Datenbankmigrationen, Edge Function und Smoke Tests
- `website/homely-haushaltsmanager.de`: statische Website fuer Datenschutz, Impressum und Kontoloeschung
- `docs`: Produkt-, Store-, Datenschutz-, Sync- und Release-Unterlagen
- `prototype`: frueher HTML-Prototyp

## Entwicklung

```powershell
cd "apps/mobile"
$env:PATH='C:\Users\hoffm\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;C:\Users\hoffm\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin;' + $env:PATH
& 'C:\Users\hoffm\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd' start
```

## Checks

```powershell
cd "apps/mobile"
& 'C:\Users\hoffm\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd' run check
```

## Website

Uebergangs-Domain fuer Google Play:

- Datenschutz: `https://aesti.de/datenschutz`
- Impressum: `https://aesti.de/impressum`
- Kontoloeschung: `https://aesti.de/konto-loeschen`

Die finale Domain kann spaeter auf `homely-haushaltsmanager.de` umgestellt werden.
