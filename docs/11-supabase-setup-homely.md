# Homely Supabase Setup

Stand: 2026-07-03

Entscheidung: Homely verwendet Supabase als Ziel-Backend fuer Account, Haushalts-Sync, Rollen und Einladungen.

## Warum Supabase

- Postgres passt zu Haushalten, Mitgliedschaften, Rollen, Aufgaben, Punkten, Essensplan und Fairness-Auswertung.
- Row Level Security kann den Haushalt als Mandanten absichern.
- Supabase Auth deckt E-Mail, Passwort, Magic Link, Passwort vergessen und spaeter Phone Auth ab.
- Realtime kann spaeter fuer sofort sichtbare Aufgaben- und Essensplan-Aenderungen aktiviert werden.

## Projekt anlegen

1. Supabase-Projekt in der Supabase-Konsole erstellen.
2. Region bewusst waehlen. Fuer deutsche/europaeische Nutzer ist eine EU-Region vorzuziehen, sofern verfuegbar.
3. Auth aktivieren.
4. E-Mail-Provider konfigurieren:
   - Start: Supabase Standard-Mail fuer Entwicklung.
   - Spaeter: eigene SMTP-Domain fuer Store-Version.
5. Redirect URLs fuer Expo/Production festlegen.

## Datenbank

Die erste Migration liegt hier:

```text
supabase/migrations/0001_homely_core.sql
```

Wenn `Automatically expose new tables` deaktiviert ist, danach auch diese Nachmigration ausfuehren:

```text
supabase/migrations/0002_data_api_grants.sql
```

Sie gibt der Supabase-Rolle `authenticated` die noetigen Data-API-Rechte. RLS bleibt weiterhin aktiv und beschraenkt die sichtbaren Zeilen.

Danach diese Bootstrap-Migration ausfuehren:

```text
supabase/migrations/0003_create_household_with_owner.sql
```

Sie legt die sichere Funktion `create_household_with_owner` an. Diese Funktion ist noetig, damit der allererste Haushalt inklusive Gruender-Mitgliedschaft trotz RLS sauber erstellt werden kann.

Fuer den Aufgaben-Sync anschliessend diese Migration ausfuehren:

```text
supabase/migrations/0004_add_planner_sync_keys.sql
```

Sie ergaenzt stabile `client_key`-Spalten fuer Mitglieder, Aufgaben, Zuordnungen und Essen. Dadurch kann die App lokale Daten mehrfach nach Supabase hochladen, ohne bei jedem Sync Duplikate zu erzeugen.

Fuer direkten Aufgabenstatus- und Zuordnungs-Sync danach ausfuehren:

```text
supabase/migrations/0005_assignment_client_key_rpcs.sql
```

Sie stellt sichere RPCs bereit, damit normale Haushaltsmitglieder Aufgaben abhaken koennen und Gruender/Verwalter Aufgaben per lokaler Sync-ID neu zuordnen koennen.

Fuer Store-relevante Haushaltsloeschung danach ausfuehren:

```text
supabase/migrations/0006_delete_household_with_data.sql
```

Sie stellt `delete_household_with_data` bereit. Nur der `owner` eines Haushalts darf diese RPC ausfuehren. Die Funktion setzt Haushalt, Mitgliedschaften, Aufgaben, Zuordnungen, Essen und Einladungen serverseitig auf `deleted_at` bzw. widerruft offene Einladungen.

Fuer Store-relevante Kontoloeschung danach ausfuehren:

```text
supabase/migrations/0007_account_deletion_support.sql
```

Sie stellt `prepare_account_deletion` bereit und lockert Auth-User-Fremdschluessel so, dass Supabase Auth den Nutzer anschliessend serverseitig loeschen kann.

Fuer stabile Einladungen und Cleanup-RPCs danach ausfuehren:

```text
supabase/migrations/0008_repair_invitation_and_deletion_rpcs.sql
```

Sie qualifiziert `pgcrypto`-Funktionen ueber das Supabase-`extensions`-Schema und stellt sicher, dass `create_household_invitation`, `accept_household_invitation` und `delete_household_with_data` remote verfuegbar sind.

Die Edge Function liegt hier:

```text
supabase/functions/delete-account/index.ts
```

Sie prueft den eingeloggten Nutzer, ruft `prepare_account_deletion` auf und loescht danach den Supabase-Auth-User per Admin-API. Der dafuer notwendige Secret Key bleibt in Supabase Edge Functions und darf niemals in die App.

Falls die Function keinen automatischen Secret-/Service-Role-Key sieht, setze ihn explizit als Function Secret:

```powershell
& 'C:\Users\hoffm\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd' dlx supabase@latest secrets set HOMELY_SUPABASE_SECRET_KEY=DEIN_SUPABASE_SECRET_KEY --project-ref enjogmjdasznqclbhkgs
```

Danach `delete-account` erneut deployen. Wichtig: `--no-verify-jwt` ist fuer diese Function beabsichtigt, weil die Function den User-Token selbst validiert.

```powershell
& 'C:\Users\hoffm\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd' dlx supabase@latest functions deploy delete-account --project-ref enjogmjdasznqclbhkgs --no-verify-jwt
```

Nach der Migration kann dieser Smoke-Test im Supabase SQL Editor ausgefuehrt werden:

```text
supabase/smoke-tests/0001_homely_core_smoke_test.sql
```

Sie enthaelt:

- `profiles`
- `households`
- `household_memberships`
- `tasks`
- `assignments`
- `meals`
- `household_invitations`
- Rollen-Enums
- Trigger fuer `updated_at`
- Profilanlage nach Supabase-Auth-Registrierung
- Row Level Security fuer Haushaltszugriff
- RPC `create_household_with_owner` zum sicheren Anlegen des ersten Haushalts mit Gruenderrolle
- RPC `mark_assignment_status` zum sicheren Abhaken durch normale Mitglieder
- RPC `create_household_invitation` zum Erzeugen eines Einladungscodes ohne Klartext-Speicherung
- RPC `accept_household_invitation` zum sicheren Beitritt per Code
- Sync-Schluessel fuer lokale Mitglieder, Aufgaben, Zuordnungen und Essen
- RPCs fuer Status- und Zuordnungsaenderungen per Sync-Schluessel
- RPC `delete_household_with_data` fuer owner-geschuetzte Cloud-Haushaltsloeschung
- RPC `prepare_account_deletion` und Edge Function `delete-account` fuer Account-Loeschung

## Zugriffsidee

- Jeder Account besitzt ein `profiles`-Profil.
- Ein Account kann in mehreren Haushalten Mitglied sein.
- Die konkrete Rolle steht in `household_memberships`.
- Ein Nutzer sieht nur Haushalte, in denen er Mitglied ist.
- `owner` und `adult` verwalten Aufgaben, Mitglieder, Essen und Einladungen.
- `child` sieht Aufgaben und kann Aufgaben erledigen.
- Aufgaben koennen einer Person zugeordnet sein und durch eine andere Person erledigt werden.

## Mobile App konfigurieren

Vorlage:

```text
apps/mobile/.env.example
```

Lokale Datei erstellen:

```text
apps/mobile/.env
```

Inhalt:

```text
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Wichtig: In neuen Supabase-Projekten gehoert der `sb_publishable_...` Key in die App. Legacy `anon` Keys sind die alte Variante fuer Client-Apps. Secret Keys oder Service-Role-Keys duerfen niemals in die App.

## Auth Redirect URLs

Wenn Supabase nach der E-Mail-Bestaetigung auf `localhost` weiterleitet, ist noch die Standard-URL aktiv.

Fuer Entwicklung ist das nicht kritisch, wenn die E-Mail dadurch bestaetigt wird und man sich danach in der App einloggen kann.

Fuer die mobile App vorbereiten:

1. In Supabase zu `Authentication > URL Configuration` gehen.
2. Unter Redirect URLs spaeter diese URL erlauben:

```text
homely://auth/callback
```

Die Expo-App hat dafuer das Scheme `homely` in `apps/mobile/app.json`.

Die App verarbeitet diesen Deep Link und kann Codes oder Token aus Supabase-E-Mail-Links in eine lokale Session uebernehmen.

Wichtig fuer Tests:

- In Supabase `Authentication > URL Configuration` muss `homely://auth/callback` als Redirect URL erlaubt sein.
- Registrieren und Passwort-zuruecksetzen verwenden diesen Redirect.
- Nach Klick auf einen E-Mail-Link sollte Homely geoeffnet und die Konto-Ansicht angezeigt werden.

## Naechste technische Schritte

Erledigt:

- `@supabase/supabase-js` installiert.
- `react-native-url-polyfill` installiert.
- `@react-native-async-storage/async-storage` in Expo-SDK-54-kompatibler Version installiert.
- Session-Speicherung fuer React Native im Supabase-Client vorbereitet.
- Auth-Service fuer Registrieren, Einloggen, Ausloggen, Passwort vergessen und Passwort aendern angelegt.
- Haushalts-Service fuer Haushalt anlegen, Haushalte laden, Mitglieder laden, Einladungen erstellen und Einladungen annehmen angelegt.
- Konto-UI kann den aktuellen lokalen Haushalt in Supabase anlegen und Einladungscodes erzeugen/annehmen.

Naechste Schritte:

1. Supabase-Projekt in der Konsole anlegen.
2. Migration `0001_homely_core.sql` ausfuehren.
3. Nachmigration `0002_data_api_grants.sql` ausfuehren.
4. Bootstrap-Migration `0003_create_household_with_owner.sql` ausfuehren.
5. Sync-Key-Migration `0004_add_planner_sync_keys.sql` ausfuehren.
6. Aufgaben-RPC-Migration `0005_assignment_client_key_rpcs.sql` ausfuehren.
7. Haushaltsloesch-Migration `0006_delete_household_with_data.sql` ausfuehren.
8. Kontoloesch-Migration `0007_account_deletion_support.sql` ausfuehren.
9. Edge Function `delete-account` deployen.
10. Optional Smoke-Test im SQL Editor ausfuehren.
11. `.env` in `apps/mobile` mit Supabase-URL und Publishable Key erstellen.
12. Konto in der App erstellen oder einloggen.
13. In der App unter `Mehr > Konto` den Button `Datenbank pruefen` ausfuehren.
   Ohne Login blockiert Row Level Security den Tabellencheck absichtlich.
14. In `Mehr > Konto` den lokalen Haushalt per `Sync anlegen` in Supabase erstellen.
15. Mit `Plan hochladen` lokale Mitglieder, Aufgaben, Punkte und Zuordnungen nach Supabase schreiben.
16. Mit `Plan laden` pruefen, ob der Supabase-Stand wieder in die App uebernommen wird.
17. Einladungen mit Code testen.
18. Automatischen Aufgaben-Service ausbauen:
   - Aufgabentitel, Punkte und Wiederholungen direkt remote speichern: erledigt
   - neue und geloeschte Aufgaben remote spiegeln: erledigt
   - Offline-first Cache erhalten

Aktueller Sync-Stand:

- `Plan hochladen` schreibt Mitglieder, Aufgaben und Zuordnungen gesammelt.
- `Plan laden` uebernimmt den Supabase-Stand lokal.
- Aufgabe abhaken schreibt den Status remote.
- Fairness-Zuordnung schreibt die neue Person remote.
- Aufgabe erstellen, bearbeiten und loeschen schreibt remote, sobald ein aktiver Sync-Haushalt gesetzt ist.
- Essensplan-Titel und optionale Koch-Person schreiben remote, sobald ein aktiver Sync-Haushalt gesetzt ist.
- `Plan hochladen` und `Plan laden` enthalten auch den langfristigen Essensplan.
- Mitglieder anlegen und bearbeiten schreibt Name, Kuerzel, Rolle und Farbe remote.
- Mitglieder loeschen setzt remote `deleted_at`, gibt das Kuerzel frei und zieht lokale Aufgaben-/Essenszuordnungen nach.
- Sync trennen entfernt die aktive Cloud-Verbindung lokal, ohne lokale Daten zu loeschen.
- Cloud-Haushalt loeschen ruft `delete_household_with_data` auf und loescht den aktiven Supabase-Haushalt fuer den Gruender serverseitig.
- Konto loeschen ruft die Edge Function `delete-account` auf und loescht Konto plus zugehoerige Homely-Cloud-Daten.
- Der Startbereich zeigt den Sync-Status: lokal, speichert, gespeichert oder Fehler.
- Bei gesetztem Sync-Haushalt laedt Homely beim App-Start automatisch den Supabase-Stand.
- Der Sync-Status im Startbereich kann angetippt werden, um den Supabase-Stand manuell zu aktualisieren.

## Mail vs. SMS

Empfehlung:

- Start mit E-Mail + Passwort.
- Magic Link optional.
- SMS erst spaeter als Zusatz, nicht als Hauptidentitaet.

Gruende:

- SMS verursacht laufende Kosten.
- Telefonnummern koennen sich aendern.
- Passwort vergessen und Einladungslinks sind per E-Mail einfacher.
- E-Mail passt besser zur Store-Version 1.

## Quellen

- Supabase Auth: https://supabase.com/docs/guides/auth
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Realtime: https://supabase.com/docs/guides/realtime
