# Homely Check-Programm

Stand: 2026-07-03

Das Check-Programm ist der wachsende technische Pruefrahmen fuer Homely. Es soll mit jeder Versionsoptimierung erweitert werden.

## Ausfuehren

```powershell
cd "C:\Users\hoffm\Documents\Family Organizer\apps\mobile"
$env:PATH = 'C:\Users\hoffm\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;C:\Users\hoffm\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin;' + $env:PATH
pnpm run check
```

Optionaler Supabase-Livecheck:

```powershell
pnpm run check:live
```

Der Livecheck verwendet nur `EXPO_PUBLIC_SUPABASE_URL` und `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` aus `apps/mobile/.env`. Er verwendet keinen Secret Key.

Optionaler authentifizierter Supabase-Livecheck:

```powershell
pnpm run check:auth-live
```

Dafuer lokal eine nicht versionierte Datei anlegen:

```text
apps/mobile/.env.check.local
```

Inhalt:

```text
HOMELY_CHECK_EMAIL=test@example.com
HOMELY_CHECK_PASSWORD=dein-testpasswort
```

Die Datei ist durch `.gitignore` abgedeckt. Sie darf echte Testaccount-Daten enthalten, aber niemals Secret Keys.

## Aktuelle Pruefungen

- TypeScript kompiliert ohne Fehler.
- Supabase-Migrationen `0001` bis `0007` sind im Repo vorhanden.
- `client_key`-Spalten und eindeutige Sync-Constraints sind fuer Mitglieder, Aufgaben, Zuordnungen und Essen definiert.
- Client-Key-RPCs fuer Aufgabenstatus und Zuordnung sind definiert und fuer `authenticated` freigegeben.
- Haushaltsloeschung und Kontoloesch-Vorbereitung sind als RPCs/Edge Function im Repo vorhanden.
- Sync-Payloads fuer Mitglieder, Aufgaben, Zuordnungen und Essen werden rechnerisch simuliert.
- Fairness unterscheidet Plan-Einheiten und Ist-Einheiten.
- Sync-Status-UI und Remote-Schreibwege sind im Code verbunden.
- Der manuelle Sync-Testplan existiert.
- Optional: Supabase REST ist erreichbar.
- Optional: anonyme REST-Zugriffe auf Haushaltsdaten werden durch RLS blockiert.
- Optional: Testaccount kann sich einloggen und eigene Haushaltsdaten lesen.

## Erweiterungen

Spaeter ergaenzen wir:

- RLS-Rechtepruefung fuer Gruender, Verwalter und Mitglied.
- Expo/UI-Screenshot-Checks fuer Samsung-Ansichten.
- Store-Release-Check fuer Version, Buildnummer, App-Icon, Datenschutz und Metadaten.
