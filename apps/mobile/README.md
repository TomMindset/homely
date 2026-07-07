# Homely: Haushalts Manager

Expo/React-Native-App fuer Aufgaben, Essen und Fairness in Familien, WGs und Haushalten.

## Starten

Vom Ordner `apps/mobile` aus:

```powershell
pnpm start
```

Dann mit Expo Go auf Android den QR-Code scannen.

Bei alten Metro-Fehlern nach einer Umstellung den Cache leeren:

```powershell
pnpm start -- --clear
```

Falls `node` im Terminal nicht gefunden wird, zuerst den Node-Pfad setzen:

```powershell
$env:PATH = 'C:\Users\hoffm\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:PATH
```

## Pruefen

```powershell
pnpm run typecheck
```

## Branding

Die aktuellen Homely-Assets liegen in `assets/`:

- `icon.png`
- `adaptive-icon.png`
- `splash.png`

Neu erzeugen:

```powershell
python scripts/generate_brand_assets.py
```

Das Brand-Kit ist in `../../docs/04-branding-homely.md` dokumentiert.

## Struktur

- `App.tsx`: App-Schale, Header, Navigation und Screen-Auswahl
- `src/state/usePlannerState.ts`: App-Zustand, lokale Speicherung und Aenderungslogik
- `src/screens`: Heute, Woche, Fairness, Essen, Aufgaben und Haushalt
- `src/components`: wiederverwendbare UI-Bausteine
- `src/styles/plannerStyles.ts`: gemeinsame Styles
- `src/theme`: Designset-Paletten, Theme Provider und dynamische Theme-Hilfen
- `src/constants/planner.ts`: Navigation, Tage, Farben und Formatierung
- `src/services/supabaseClient.ts`: Supabase-Client mit Expo-Env-Konfiguration
- `src/services/authService.ts`: E-Mail-/Passwort-Auth-Aktionen
- `src/services/householdService.ts`: Supabase-Haushalte, Mitgliedschaften und Einladungen
- `src/services/databaseHealthService.ts`: Supabase-Tabellencheck fuer Migrationstest
- `../../docs/05-datenschutz-homely.md`: Datenschutz- und Sicherheitskonzept
- `../../docs/06-play-store-data-safety-homely.md`: Play-Store-Data-Safety-Entwurf
- `../../docs/07-play-store-listing-homely.md`: Store-Texte
- `../../docs/08-play-store-screenshots-homely.md`: Screenshot-Storyboard
- `../../docs/09-account-familienzugriff-sync.md`: Account- und Familien-Sync-Konzept
- `../../docs/10-eas-build-release-homely.md`: EAS-Build- und Release-Plan
- `../../docs/11-supabase-setup-homely.md`: Supabase-Setup, Migration und naechste Backend-Schritte

## Aktueller Stand

- Expo SDK 54, passend zu Expo Go Client `54.x`
- App-Name: `Homely`
- Store-Titel: `Homely: Haushalts Manager`
- Android-Paketname: `com.homely.haushaltsmanager`
- Android-VersionCode: `1`
- EAS-Build-Konfiguration fuer Preview und Production
- App-Icon und Splash Screen fuer Homely
- Daten aus der Excel als TypeScript-Seed
- Kalenderwochen-Navigation
- Tagesansicht
- Wochenansicht
- Wochenansicht mit Kennzahlen und Vorschau auf kommende Kalenderwochen
- Fairness-Auswertung
- neutrales Onboarding mit Haushaltsname und frei eingebbaren Mitgliedern
- Rollenmodell mit aktivem Nutzer: Gruender, Verwalter, Mitglied
- Essensplan
- Aufgabenliste
- Neue Aufgaben
- Neue Aufgaben mit Wiederholung: einmalig, taeglich oder ausgewaehlte Wochentage
- Wiederkehrende neue Aufgaben werden ab Start-KW bis Jahresende geplant
- Regeln eigener Aufgaben editierbar: Wiederholung, Wochentage und Start-KW
- Lokale Reminder-Vorstufe: Erinnerung pro Aufgabe am selben Tag oder am Vortag mit Uhrzeit
- Aufgaben und Punkte editierbar
- Loeschbestaetigungen fuer Aufgaben und Personen
- Aufgaben loeschbar
- Personen anlegbar und editierbar
- Personen loeschbar
- Aufgabenzuordnung in der Fairness-Ansicht verwaltbar
- Verwaltungsfunktionen in der Mitgliedsansicht gesperrt
- Essensplan editierbar
- Darkmode-Schalter
- Datenschutz-Hinweis im Haushaltsbereich
- lokale Datei-Speicherung fuer Aufgaben, Personen, Haushaltsname, Zuordnungen, Erledigungen, Essensplan und Darkmode
- Play-Store-Texte als Arbeitsfassung
- Screenshot-Storyboard fuer Play Store
- Account-/Haushalts-Sync-Konzept mit Supabase-Empfehlung
- Supabase-Entscheidung, Kernschema und RLS-Migration vorbereitet
- Supabase-Env-Vorlage fuer Expo vorbereitet
- Supabase-Client, Session-Speicherung und Auth-Service vorbereitet
- Supabase-Haushaltsservice und Einladungsservice vorbereitet
- Konto-UI kann Supabase-Haushalte laden, anlegen und Einladungscodes erzeugen/annehmen
- Konto-UI kann Supabase-Datenbanktabellen pruefen
- Designsets steuern App-Hintergrund, Karten, Buttons, Chips und Akzentflaechen
- Homely-Logo bleibt als feste Markenkennung unabhaengig vom Designset
- Geraete-Test ohne native Zusatzmodule

## Noch nicht enthalten

- Haushalts-Accounts und echte Einladungen
- Multi-Device-Sync
- Push-Erinnerungen
- produktiv verbundene Supabase-Datenbank
- live verbundener Supabase-Mobile-Client mit echten Projektwerten
- Aufgaben-/Essensplan-Sync gegen Supabase
- oeffentliche Datenschutz-URL
- rechtliche Pruefung der Datenschutzerklaerung
- echter EAS Preview-/Production-Build mit Expo-Login
