# Homely EAS Build und Release

Stand: 2026-07-03

Dieses Dokument beschreibt die technische Build-Vorbereitung fuer **Homely: Haushalts Manager**.

## Aktueller Stand

- Expo SDK 54
- React Native 0.81.5
- App-Version: `1.0.0`
- Android Package: `com.homely.haushaltsmanager`
- Android `versionCode`: `4`
- Produkt-/Repo-Name: `homely`
- Expo/EAS-interner Slug fuer das verknuepfte Projekt: `right-to-lead`
- EAS-Projekt verknuepft mit Project ID `553f7f58-5e68-46ca-988a-99c7cf2e3a74`
- EAS Dashboard-Name: `Homely`
- EAS Project ID: `553f7f58-5e68-46ca-988a-99c7cf2e3a74`
- EAS-Konfiguration vorhanden: `apps/mobile/eas.json`
- Production-Profil erzeugt Android App Bundle `.aab`
- Preview-Profil erzeugt interne Android APK
- Android-Berechtigungen bewusst leer konfiguriert: `android.permissions: []`

## Google-Play-Anforderung

Ab 31. August 2025 muessen neue Apps und Updates fuer normale Android-Apps Android 15 / API Level 35 oder hoeher targeten.

Fuer Homely bedeutet das:

- Expo SDK 54 beibehalten oder neuer nutzen.
- Vor Production-Build pruefen, welches `targetSdkVersion` der gebaute AAB tatsaechlich enthaelt.
- Kein Upload eines Builds, der unter API Level 35 targetet.

## Versionierung

In `app.json`:

- `expo.version`: sichtbare App-Version, z. B. `0.1.0`
- `android.versionCode`: interne Android-Buildnummer, muss fuer jeden Play-Store-Upload steigen

Aktuelle Regel:

- App-Version manuell pflegen.
- Production-Build darf `versionCode` automatisch erhoehen.
- Release-Notes pro Store-Version in `docs/releases/` ergaenzen, sobald wir echte Versionen schneiden.

## Build-Profile

### development

Fuer Development Builds, falls Expo Go spaeter nicht mehr reicht.

```powershell
eas build --platform android --profile development
```

### preview

Fuer interne APK-Tests ausserhalb des Play Store.

```powershell
eas build --platform android --profile preview
```

### production

Fuer Google Play. Erzeugt `.aab`.

```powershell
eas build --platform android --profile production
```

Robuster Befehl fuer diese Windows/Codex-Umgebung ohne Git im PATH:

```powershell
cd "C:\Users\hoffm\Documents\Family Organizer\apps\mobile"
$env:PATH='C:\Users\hoffm\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;C:\Users\hoffm\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin;' + $env:PATH
$env:EAS_NO_VCS='1'
$env:EAS_PROJECT_ROOT='C:\Users\hoffm\Documents\Family Organizer\apps\mobile'
$env:EAS_BUILD_NO_EXPO_GO_WARNING='1'
& 'C:\Users\hoffm\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd' dlx eas-cli@latest build --platform android --profile production --non-interactive --no-wait --message "Homely production AAB pre-store build"
```

## Lokaler Start

```powershell
cd "C:\Users\hoffm\Documents\Family Organizer\apps\mobile"
$env:PATH='C:\Users\hoffm\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;C:\Users\hoffm\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin;' + $env:PATH
& 'C:\Users\hoffm\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd' start
```

## Preflight vor jedem Build

```powershell
& 'C:\Users\hoffm\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd' run typecheck
& 'C:\Users\hoffm\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd' run check
```

Kompakter Build-Preflight inklusive oeffentlicher Expo-Konfiguration:

```powershell
cd "C:\Users\hoffm\Documents\Family Organizer\apps\mobile"
$env:PATH='C:\Users\hoffm\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;C:\Users\hoffm\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin;' + $env:PATH
& 'C:\Users\hoffm\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd' run build:preflight
```

Optional mit Supabase:

```powershell
& 'C:\Users\hoffm\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd' run check:live
```

## Voraussetzungen fuer echten Store-Launch

Vor dem ersten echten Production-Build:

1. Expo Account und EAS-Projekt sauber auf Homely pruefen.
2. Android Signing Credentials durch EAS verwalten lassen oder bewusst eigene Keystore-Strategie waehlen.
3. Supabase Site URL und Redirect URLs final konfigurieren.
4. Datenschutz-URL oeffentlich hosten.
5. Data-Safety-Formular in Play Console passend zur App ausfuellen.
6. Store-Listing finalisieren.
7. Screenshots und Feature Graphic erstellen.
8. Content Rating ausfuellen.
9. Target Audience and Content ausfuellen.
10. Testkonto oder Review-Hinweise bereitstellen, falls Google Login/Sync pruefen soll.
11. Interne Tests auf echtem Android-Geraet durchfuehren.
12. Production-AAB bauen und in Google Play Console hochladen.

## Technischer Stand nach Preflight 2026-07-04

- `eas.json` Production-Profil erzeugt `app-bundle`.
- `eas.json` nutzt `appVersionSource: local`.
- Production-Builds erhoehen `android.versionCode` automatisch.
- `app.json` enthaelt `com.homely.haushaltsmanager` als stabiles Android Package.
- `android.permissions` ist bewusst leer.
- `expo config --type public` ist lokal erfolgreich.
- `pnpm run check` prueft die App- und Store-Basis automatisch mit.
- `pnpm run build:preflight` prueft zusaetzlich, ob ein EAS-Projekt fuer Production-Builds verknuepft ist.
- Der konkrete `targetSdkVersion`-Nachweis erfolgt nach dem EAS Production Build ueber das erzeugte AAB bzw. die Google-Play-Uploadpruefung.

## EAS-Projektname 2026-07-04

Der erste Production-Build wurde bewusst gestartet und hat gezeigt:

- Die alte EAS Project ID `553f7f58-5e68-46ca-988a-99c7cf2e3a74` zeigte serverseitig zunaechst auf `@tommindsets-team/right-to-lead`.
- Das Dashboard-Feld "Preview subdomain" wurde auf `homely-haushaltsmanager` gesetzt.
- Lokal bleibt der Expo-Slug fuer EAS-Builds auf `right-to-lead`, weil die bestehende Project ID diesen Slug serverseitig erwartet.
- Fuer Google Play sind Android Package `com.homely.haushaltsmanager`, App-Name `Homely`, Versionierung und AAB entscheidend.
- Falls EAS weiterhin historische Build-URLs mit `right-to-lead` zeigt, sind fuer Google Play Android Package `com.homely.haushaltsmanager`, App-Name, Versionierung und AAB entscheidend.

## Troubleshooting 2026-07-04

Fehler beim Buildstart:

```text
request to https://api.expo.dev/graphql failed
GraphQL request failed
```

Geprueft:

- `eas whoami` funktioniert: Account ist eingeloggt.
- `eas project:info` funktioniert: Zugriff auf Projekt besteht.
- `eas build:list --platform android --limit 1 --json` funktioniert: GraphQL ist grundsaetzlich erreichbar.

Naechste Schritte:

1. Buildbefehl mit gesetztem `EAS_PROJECT_ROOT` erneut starten.
2. Falls der Fehler wiederkommt, denselben Befehl mit `--verbose-logs` erneut starten.
3. Wenn auch das scheitert, kurz warten und erneut versuchen, da der Fehler nach erfolgreichem `build:list` eher nach transientem API-/Netzwerkfehler aussieht.
4. Wenn EAS Credentials interaktiv abfragt, `eas credentials -p android` manuell aus PowerShell starten und EAS-managed Android Credentials auswaehlen.

Optionaler spaeterer Aufraeumschritt im Expo/EAS Dashboard:

1. Entweder das vorhandene Projekt `right-to-lead` in `homely-haushaltsmanager` umbenennen, falls Expo das fuer dieses Projekt erlaubt.
2. Oder ein neues EAS-Projekt fuer Homely anlegen.
3. Danach die neue oder korrigierte Project ID mit `eas init --id <PROJECT_ID> --force` verknuepfen.
4. Danach `pnpm run build:preflight` erneut ausfuehren.

## Empfohlene Reihenfolge

1. App-Konfiguration pruefen.
2. Supabase-Auth-Redirects korrigieren.
3. Konto-/Haushaltsloeschung umsetzen.
4. App-Flows final testen.
5. Store-Screenshots erstellen.
6. Datenschutz-URL veroeffentlichen.
7. Preview-Build fuer echte Geraetetests.
8. Production-AAB bauen.
9. Interner Testtrack in Google Play.
10. Review-Feedback einarbeiten.
11. Production-Rollout.

## Aktueller Preview-Build

- Build ID: `fd60f682-b902-4009-a2e1-de8c000efc7d`
- Profil: `preview`
- Status zuletzt: `FINISHED`
- Logs: https://expo.dev/accounts/tommindsets-team/projects/right-to-lead/builds/fd60f682-b902-4009-a2e1-de8c000efc7d
- APK: https://expo.dev/artifacts/eas/QwWP3bgSVqiJ3Jn_CS5cFftoPqf1xjpTSHMenz-DJGM.apk

## Aktueller Production-AAB

- Build ID: `150d47cd-46f3-4ed4-af3a-be5cea351020`
- Profil: `production`
- Distribution: `STORE`
- Status zuletzt: `FINISHED`
- App-Version: `0.1.0`
- Android Build Version / `versionCode`: `2`
- SDK-Version: `54.0.0`
- Fingerprint: `32b395e9038428cf2e565d46f8e98b62a1b1ea6c`
- Logs: https://expo.dev/accounts/tommindsets-team/projects/right-to-lead/builds/150d47cd-46f3-4ed4-af3a-be5cea351020
- AAB: https://expo.dev/artifacts/eas/-wByw0wW_KY_-5JgJqCeiqp6K758qugV2t2t9GIbUbY.aab

Hinweis: Dieser Build war der erste store-faehige Android App Bundle Build fuer Homely. Fuer den Go-live-Stand ist ein neuer Production-Build mit App-Version `1.0.0` vorgesehen.

## Go-live-Kandidat 2026-07-07

- App-Version: `1.0.0`
- Android Build Version / `versionCode`: `4`
- EAS Production-Env: `EXPO_PUBLIC_SUPABASE_URL` und `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` gesetzt
- Build ID: `5923f656-90e0-4c11-8e71-670074981e13`
- Status zuletzt: `FINISHED`
- Logs: https://expo.dev/accounts/tommindsets-team/projects/right-to-lead/builds/5923f656-90e0-4c11-8e71-670074981e13
- AAB: https://expo.dev/artifacts/eas/CiEYZeiE3LVycOqnL_lRBzDxrLkBSiundJAQeVXfBTE.aab
- Lokale Kopie: `artifacts/homely-1.0.0-versionCode4.aab`
- SHA-256: `7F742D74F2ADD21E50AC401C6008592F31505230FC9291FF902FB399CC07F89B`
- Relevante Website-URLs live geprueft:
  - https://aesti.de/
  - https://aesti.de/datenschutz
  - https://aesti.de/konto-loeschen
  - https://aesti.de/impressum

## Warum ein AAB bewusst als eigener Schritt kommt

Ein echtes Android App Bundle wird remote ueber EAS erzeugt und betrifft:

- Internetzugriff
- Expo-Login
- Projektverknuepfung mit EAS
- Android-Signatur
- Store-faehigen Build-Artefakt

Diese Schritte sollten bewusst interaktiv erfolgen, weil sie Account- und Release-Credentials betreffen.

## Quellen

- Expo EAS Build: https://docs.expo.dev/build/introduction/
- Expo App Version Management: https://docs.expo.dev/build-reference/app-versions/
- Google Play Target API Level: https://support.google.com/googleplay/android-developer/answer/11926878
