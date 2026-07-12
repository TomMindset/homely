# Homely Sync-Testplan

Stand: 2026-07-12

Ziel: pruefen, ob der lokale Homely-Plan und Supabase fuer Haushalt, Mitglieder, Aufgaben, Zuordnungen und Essen konsistent zusammenarbeiten.

## Vorbereitung

1. Expo-App neu laden.
2. Mit dem Gruenderkonto einloggen.
3. `Mehr > Konto > Haushalte laden` ausfuehren.
4. Den richtigen Haushalt aktivieren.
5. Falls noetig `Plan hochladen` ausfuehren.

## Erststart und Musteraufgabenpakete

- Neuer lokaler Haushalt startet ohne private Demo-Namen.
- Gruendername ist Pflicht.
- Startprofile `Familie`, `WG`, `Paar` und `Haus` setzen passende Musteraufgabenpakete.
- Die Startplan-Vorschau zeigt Aufgabenanzahl, Punkte und aktive Pakete vor dem Start.
- Mindestens ein Musteraufgabenpaket ist Pflicht.
- Vorauswahl `Basis` und `Essen` erzeugt einen kleinen Startplan statt aller Excel-Vorlagen.
- Zusaetzliche Pakete wie `Familie`, `WG`, `Putzen` oder `Extras` aktivieren passende weitere Aufgaben.
- Nicht gewaehlte Standardaufgaben erscheinen nicht in `Heute`, koennen unter `Aufgaben` aber ueber `Vorlagen wiederherstellen` reaktiviert werden.

## Supabase-Grundcheck

- `Datenbank pruefen` zeigt keine fehlenden Tabellen.
- `profiles`, `households`, `household_memberships`, `tasks`, `assignments`, `meals`, `household_invitations`, `push_tokens`, `notification_preferences`, `notification_log` sind erreichbar.
- Migrationen `0001` bis `0013` sind in Supabase ausgefuehrt.
- Edge Function `delete-account` ist deployed, bevor die Kontoloeschung getestet wird.
- Redirect URL `homely://auth/callback` ist in Supabase erlaubt.
- E-Mail-Bestaetigungslink oder Passwort-Reset-Link oeffnet Homely und setzt die Session.

## App-Sync

- `Plan hochladen` speichert Mitglieder, Aufgaben, Zuordnungen und Essen.
- `Plan laden` springt auf `Heute` und zeigt den Supabase-Stand.
- Der Status-Chip zeigt `Plan aus Supabase geladen` oder `... gespeichert`.
- Bei Sync-Fehlern zeigt der Kopfbereich einen ruhigen Hinweis, dass lokale Aenderungen erhalten bleiben.
- Nach App-Neustart bleibt der aktive Sync-Haushalt gesetzt.

## Aufgaben

- `Heute` gruppiert sichtbare Aufgaben in `Jetzt wichtig`, `Spaeter heute` und `Erledigt`.
- Aufgaben mit spaeterer Erinnerung erscheinen unter `Spaeter heute`; Aufgaben ohne Uhrzeit oder mit faelliger Erinnerung erscheinen unter `Jetzt wichtig`.
- Aufgabe abhaken synchronisiert den Status.
- `Erledigt von` entspricht dem eingeloggten/aktiven Mitglied.
- Fairness-Zuordnung auf eine andere Person wird remote gespeichert.
- Aufgabe neu anlegen erscheint nach `Plan laden` weiterhin.
- Aufgabe bearbeiten speichert Titel, Punkte und Wiederholung.
- Wiederholungen `alle X Wochen`, `monatlich` und `jaehrlich` erzeugen sichtbare Zukunftstermine in der Langzeituebersicht.
- Nach `Plan hochladen` und `Plan laden` bleiben Intervall, Monat und Tag der Wiederholung erhalten.
- Muelltermin anlegen erzeugt eine wiederkehrende Aufgabe mit passendem Rhythmus, Erinnerung und Zuordnung.
- Muelltermin bleibt nach `Plan hochladen` und `Plan laden` erhalten.
- `Uebliche Zustaendigkeit` setzt offene Termine einer Aufgabe ab der gewaehlten KW auf eine Standardperson.
- Bereits erledigte Aufgaben werden durch `Uebliche Zustaendigkeit` nicht veraendert.
- Beim Bearbeiten zeigt `Fair verteilen` einen bestaetigungspflichtigen Vorschlag nach aktueller Wochenlast.
- Aufgabe loeschen verschwindet nach `Plan laden`.
- Direkt nach dem Loeschen kann `Rueckgaengig` die Aufgabe inklusive Zuordnungen wiederherstellen.
- Aufgaben-Langzeituebersicht zeigt kommende Wochen und nicht nur die aktuelle KW.
- Wochenansicht zeigt fuer leere Tage einen klaren Leerzustand statt eines leeren Abschnitts.

## Essensplan

- Gericht bearbeiten bleibt nach `Plan laden` erhalten.
- Koch-Person setzen bleibt nach `Plan laden` erhalten.
- Zwei Gerichte tauschen tauscht Gericht und Koch-Person.
- Langfristige Wochen bleiben erhalten.

## Mitglieder

- Mitglied anlegen erscheint nach `Plan laden`.
- Name, Kuerzel, Farbe und Rolle bleiben nach Bearbeitung erhalten.
- Mitglied loeschen entfernt es aus der aktiven Ansicht.
- Aufgaben des geloeschten Mitglieds werden lokal und remote auf ein Ersatzmitglied gelegt.
- Essensplan-Kochzuordnungen des geloeschten Mitglieds werden entfernt.

## Einladungen und Rechte

- Gruender/Verwalter kann Einladungscode erzeugen.
- Zweiter Account kann Einladungscode annehmen.
- Normales Mitglied kann Aufgaben abhaken.
- Normales Mitglied kann Aufgaben, Mitglieder und Essen nicht verwalten.
- Verwalter kann Aufgaben, Mitglieder und Essen verwalten.

## Fairness

- Fairness zeigt je Person Soll, Plan und Ist als Zahlen und Balken.
- Wochenverlauf zeigt die Spanne der letzten sichtbaren Wochen.
- Wenn eine Aufgabe erledigt wird, erscheint auf `Heute` ein kurzer `Danke-Moment`.

## Push-Benachrichtigungen

- Migration `0009_push_notifications.sql` ist in Supabase ausgefuehrt.
- Migration `0010_task_reminder_dispatch.sql` ist in Supabase ausgefuehrt.
- Migration `0011_notification_preference_controls.sql` ist in Supabase ausgefuehrt.
- Migration `0012_notification_dispatch_expansion.sql` ist in Supabase ausgefuehrt.
- Edge Function `send-task-reminders` ist deployed und mit `HOMELY_REMINDER_SECRET` geschuetzt.
- Supabase Cron ruft `send-task-reminders` regelmaessig auf.
- In der installierten Preview-/Play-Test-App unter `Mehr > Konto > Push` `Aktivieren` ausfuehren.
- Android fragt nach Benachrichtigungsberechtigung und der Nutzer kann bewusst zustimmen.
- Danach zeigt der Bereich mindestens ein registriertes Geraet.
- `Test senden` erzeugt auf dem Geraet eine lokale Homely-Testbenachrichtigung.
- Aufgaben-Erinnerungen, Aenderungshinweise, ueberfaellige Aufgaben und Haushaltsstatus lassen sich einzeln speichern.
- Ruhezeit von `21:00` bis `07:00` speichern und pruefen, dass die Werte nach `Status` erhalten bleiben.
- Supabase enthaelt fuer den eingeloggten Nutzer einen aktiven Eintrag in `push_tokens`.
- Aufgabe mit Erinnerung im naechsten Zeitfenster erzeugt einen Eintrag in `notification_log`.
- Aufgabe mit Erinnerung innerhalb der Ruhezeit wird im Claim auf das Ende der Ruhezeit verschoben.
- Eine eigene ueberfaellige Aufgabe erzeugt hoechstens einmal taeglich einen `task_overdue`-Eintrag in `notification_log`.
- Ein Gruender/Verwalter mit aktivem Haushaltsstatus erzeugt hoechstens einmal taeglich einen `household_summary`-Eintrag in `notification_log`.
- `notification_log.status` wechselt nach Versand auf `sent` oder bei Problemen auf `failed`.
- `Push deaktivieren` setzt die Geraete des Nutzers auf inaktiv und schaltet Preferences aus.
- Zweites Konto registriert einen eigenen Push-Token, ohne Tokens des Gruenders sehen oder veraendern zu koennen.

## Automatischer Mehrkonto-Live-Check

Der automatisierte Check nutzt zwei bestehende Supabase-Testkonten. Er legt einen temporaeren Haushalt an, laedt Aufgaben/Zuordnungen/Essen hoch, laedt den Haushalt mit dem zweiten Konto, prueft Rollenrechte und loescht den temporaeren Haushalt danach wieder.

Wichtig: `Konto erstellen` setzt bei bereits vorhandenen Supabase-Auth-Konten kein neues Passwort. Wenn der Login `Invalid login credentials` meldet, Passwort per App-Funktion `Neu anfordern` oder im Supabase Dashboard neu setzen.

Datei `apps/mobile/.env.check.local`:

```env
HOMELY_OWNER_EMAIL=gruender-test@example.com
HOMELY_OWNER_PASSWORD=...
HOMELY_SECOND_EMAIL=mitglied-test@example.com
HOMELY_SECOND_PASSWORD=...
```

Passwort fuer bestehende Testkonten per Supabase Admin API setzen:

1. In Supabase unter `Settings > API Keys` einen `Secret key` fuer Backend/Admin-Zwecke kopieren.
2. Lokal die Datei `apps/mobile/.env.admin.local` anlegen. Diese Datei wird durch `.gitignore` nicht versioniert.
3. Inhalt:

```env
SUPABASE_SECRET_KEY=sb_secret_...
```

4. PowerShell:

```powershell
cd "C:\Users\hoffm\Documents\Family Organizer\apps\mobile"
$env:PATH='C:\Users\hoffm\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;C:\Users\hoffm\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin;' + $env:PATH
& 'C:\Users\hoffm\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd' run auth:reset-test-passwords
```

PowerShell:

```powershell
cd "C:\Users\hoffm\Documents\Family Organizer\apps\mobile"
$env:PATH='C:\Users\hoffm\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;C:\Users\hoffm\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin;' + $env:PATH
& 'C:\Users\hoffm\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd' run check -- --multi-auth-live
```

Automatisch geprueft:

- Gruender und zweites Konto koennen sich einloggen.
- Gruender kann Haushalt anlegen und Plan-Daten hochladen.
- Gruender kann das zweite Konto als Mitglied einladen.
- Zweites Konto kann beitreten und denselben Haushalt mit Aufgaben, Zuordnungen und Essen lesen.
- Mitglied darf Aufgaben erledigen/uebernehmen.
- Mitglied darf Aufgaben und Zuordnungen nicht verwalten.
- Gruender kann Mitglied zum Verwalter hochstufen.
- Verwalter darf Aufgaben anlegen und Zuordnungen aendern.
- Temporaerer Test-Haushalt wird per Supabase-RPC geloescht.

## Daten und Loeschung

- `Sync trennen` entfernt den aktiven Sync-Haushalt lokal, ohne lokale Aufgaben zu loeschen.
- Nach erneutem `Haushalte laden` kann ein vorhandener Haushalt wieder aktiviert werden.
- `Cloud-Haushalt loeschen` ist nur fuer den Gruender erfolgreich.
- Nach Cloud-Loeschung erscheint der Haushalt nicht mehr unter `Haushalte laden`.
- Normale Mitglieder erhalten beim Cloud-Loeschen eine Rollen-/Owner-Fehlermeldung.
- `Konto loeschen` loescht mit einem Testaccount Supabase-Auth-Identitaet und zugehoerige Homely-Cloud-Daten.
- Google-Play-Webressource fuer Kontoloesch-Anfragen ist als offener Store-Punkt dokumentiert.

## Ergebnisnotizen

- OK:
- Probleme:
- Nacharbeit:
