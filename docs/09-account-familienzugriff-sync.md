# Homely Account- und Haushaltszugriff

Stand: 2026-07-03

Ziel: Homely soll von mehreren Personen im gleichen Haushalt genutzt werden koennen, ohne dass fremde Nutzer Zugriff auf andere Haushaltsbereiche erhalten.

## Empfehlung

Fuer Version 1 bleibt Homely lokal nutzbar, bietet aber E-Mail-Konto und optionalen Supabase-Sync fuer gemeinsame Haushalte.

Supabase ist als Ziel-Backend festgelegt.

Warum Supabase:

- PostgreSQL passt gut zu Haushalten, Mitgliedern, Rollen, Aufgaben, Wochen, Mahlzeiten und Erledigungen.
- Row Level Security eignet sich gut fuer "Nutzer darf nur Haushalte sehen, in denen er Mitglied ist".
- Auth, Datenbank, Realtime und Storage liegen in einem System.
- Das Datenmodell bleibt relational und leichter auditierbar als stark verschachtelte Dokumentstrukturen.

Firebase bleibt eine starke Alternative, besonders wenn sehr schnelle Mobile-Integration, Firestore-Offline-Faehigkeiten und Firebase Cloud Messaging wichtiger werden. Fuer Homelys Rollen-, Mitgliedschafts- und Fairnessmodell ist Supabase aber fachlich sauberer.

## Zielarchitektur fuer Sync

### Grundprinzip

- Ein Haushalt ist ein eigener Mandant.
- Jeder Account sieht nur Haushalte, in denen er Mitglied ist.
- Jeder Account ist fest mit genau seinem Haushaltsmitglied verbunden.
- Andere Haushaltsmitglieder sind sichtbar, aber nicht als eigene Identitaet auswaehlbar.
- Rollen regeln, wer verwalten darf.
- Mitglieder koennen Aufgaben sehen/abhaken, aber keine Haushaltsverwaltung ausfuehren.
- Gruender und Verwalter koennen Aufgaben und Zuordnungen verwalten.
- Eine Aufgabe kann einer Person zugeordnet sein, aber von einer anderen Person erledigt werden.
- Einladungen laufen ueber zeitlich begrenzte Einladungscodes oder Links.
- Lokale Nutzung bleibt moeglich.

### Rollen

| Rolle | Rechte |
|---|---|
| owner | Haushalt verwalten, Mitglieder einladen/entfernen, Daten loeschen |
| adult | Aufgaben, Essen und Mitglieder verwalten |
| child | Aufgaben sehen und abhaken, aber nicht verwalten |

## Datenmodell

### households

| Feld | Typ | Beschreibung |
|---|---|---|
| id | uuid | Haushalts-ID |
| name | text | Haushaltsname |
| created_by | uuid | Account des Erstellers |
| created_at | timestamp | Erstellung |

### household_memberships

| Feld | Typ | Beschreibung |
|---|---|---|
| id | uuid | Mitgliedschafts-ID |
| household_id | uuid | Haushalt |
| user_id | uuid nullable | Verknuepfter Account, bei Kindern optional leer |
| display_name | text | Anzeigename |
| short_code | text | Kuerzel |
| role | enum/text | owner, adult, child |
| color | text | Profilfarbe |
| client_key | text nullable | stabile lokale ID fuer Sync |
| deleted_at | timestamp nullable | Soft Delete |
| created_at | timestamp | Erstellung |

### tasks

| Feld | Typ | Beschreibung |
|---|---|---|
| id | uuid | Aufgabe |
| household_id | uuid | Haushalt |
| client_key | text nullable | stabile lokale ID fuer Sync |
| title | text | Titel |
| category | text | Kategorie |
| effort_units | numeric | Punkte/Aufwand |
| recurrence_type | text | once, daily, weekly_days |
| scheduled_days | text[] | Wochentage |
| recurrence_start_year | integer nullable | Startjahr |
| recurrence_start_week | integer nullable | Start-KW |
| reminder_enabled | boolean | Erinnerung aktiv |
| reminder_time | text | Uhrzeit |
| reminder_lead_days | integer | 0 oder 1 |
| deleted_at | timestamp nullable | Soft Delete |

### assignments

| Feld | Typ | Beschreibung |
|---|---|---|
| id | uuid | konkrete Aufgabe |
| household_id | uuid | Haushalt |
| client_key | text nullable | stabile lokale ID fuer Sync |
| task_id | uuid | Aufgabe |
| member_id | uuid | zugewiesene Person |
| completed_by_member_id | uuid nullable | Person, die tatsaechlich erledigt hat |
| year | integer | Jahr |
| week | integer | Kalenderwoche |
| day | text | Wochentag |
| day_index | integer | Wochentag als Zahl |
| date | date | Datum |
| status | text | open, done, skipped, moved |
| deleted_at | timestamp nullable | Soft Delete |

### meals

| Feld | Typ | Beschreibung |
|---|---|---|
| id | uuid | Mahlzeit |
| household_id | uuid | Haushalt |
| client_key | text nullable | stabile lokale ID fuer Sync |
| year | integer | Jahr |
| week | integer | Kalenderwoche |
| day | text | Wochentag |
| day_index | integer | Wochentag als Zahl |
| date | date | Datum |
| title | text | Gericht |
| cook_member_id | uuid nullable | kochende Person |
| deleted_at | timestamp nullable | Soft Delete |

## Zugriffsschutz mit Supabase RLS

Regelidee:

- SELECT/INSERT/UPDATE/DELETE auf Haushaltsdaten nur, wenn `auth.uid()` Mitglied desselben Haushalts ist.
- Schreibzugriff auf Verwaltungstabellen nur fuer `owner` und `adult`.
- Loeschen des Haushalts nur fuer `owner`.
- Mitglieder ohne Verwaltungsrolle koennen Aufgabenstatus aktualisieren, aber keine Aufgabenregeln oder Mitglieder verwalten.
- Wenn eine Person eine Aufgabe fuer jemand anderen erledigt, wird `completed_by_member_id` gesetzt. Die urspruengliche Zuordnung bleibt erhalten.

## Einladungskonzept

1. Owner/Adult erstellt Einladung.
2. Homely erzeugt Code oder Link.
3. Code hat Ablaufdatum, z. B. 7 Tage.
4. Eingeladene Person meldet sich an.
5. Server prueft Code und legt/verknuepft Mitgliedschaft an.

Wichtig fuer App-Logik:

- Der einladende Gruender oder Verwalter waehlt Rolle und Anzeigename vor.
- Die eingeladene Person kann ihr eigenes Profil bestaetigen.
- Nach dem Beitritt ist der Account fest mit diesem Mitglied verknuepft.
- Ein Nutzer kann nicht einfach in die Identitaet eines anderen Mitglieds wechseln.
- In Entwicklungs-/Adminansichten darf Rollenwechsel nur fuer Gruender/Verwalter sichtbar sein.

## Datenschutzfolgen

Mit Sync gelten fuer Datenschutz und Play-Store-Data-Safety:

- Account-Daten werden erhoben.
- Haushalts- und Aufgabendaten werden in der Cloud gespeichert.
- Datenuebertragung muss verschluesselt erfolgen.
- Kontoloeschung muss in der App und/oder ausserhalb der App moeglich sein.
- Datenschutzerklaerung muss Anbieter, Hosting, Zwecke, Loeschung und Kontakt enthalten.

## Migrationspfad

### Phase 1: Lokal nutzbarer Haushalt

Lokale Mitglieder, Aufgaben, Punkte, Essen und Fairness funktionieren ohne Cloud-Zwang.

### Phase 2: Sync-faehige IDs

Interne IDs stabilisieren, `client_key`, `updated_at` und `deleted_at` nutzen.

### Phase 3: Optionaler Account

Nutzer kann lokal starten und spaeter Sync aktivieren.

### Phase 4: Haushalts-Sync

Haushalt erstellen, Mitglieder einladen, Aufgaben und Erledigungen synchronisieren.

Die Supabase-Migrationen liegen in `supabase/migrations/`.
Das konkrete Setup ist in `docs/11-supabase-setup-homely.md` dokumentiert.

### Phase 5: Push und echte Erinnerungen

Push nur nach sauberer Einwilligung und Datenschutzanpassung.

## Quellen

- Firebase Authentication: https://firebase.google.com/docs/auth
- Firebase Firestore Security Rules: https://firebase.google.com/docs/firestore/security/get-started
- Supabase Auth: https://supabase.com/docs/guides/auth
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
