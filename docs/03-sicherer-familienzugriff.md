# Sicherer Familienzugriff

Ziel: Mehrere Familienmitglieder sollen auf denselben Familienbereich zugreifen koennen. Andere Nutzer duerfen nur ihren eigenen Familienbereich sehen.

## Empfohlener Ansatz

Fuer die erste Store-faehige Mehrnutzer-Version eignet sich ein Backend-as-a-Service wie Supabase oder Firebase besser als ein eigener Server.

Empfehlung fuer dieses Projekt: Supabase.

- Authentifizierung per E-Mail, Magic Link oder spaeter Social Login
- Jede Familie bekommt eine eigene `family_id`
- Jede Person ist Mitglied genau eines oder mehrerer Familienbereiche
- Datenbankregeln verhindern Zugriff auf fremde Familien
- Aufgaben, Personen, Zuordnungen und Erledigungen werden pro `family_id` gespeichert

## Datenmodell

- `families`: Familienbereiche
- `family_members`: Nutzer, Rolle und Anzeigename pro Familie
- `task_templates`: Aufgaben mit Punkten und Kategorie
- `assignments`: konkrete Aufgabeninstanzen mit Datum, Person und Status
- `schedule_rules`: Wiederholungsregeln
- `meals`: Essensplan
- `invites`: Einladungen in eine Familie

## Rollen

- `owner`: Familie erstellen, Mitglieder verwalten, Regeln und Aufgaben bearbeiten
- `adult`: Aufgaben, Personen und Zuordnungen bearbeiten
- `child`: eigene Aufgaben sehen und erledigen
- `viewer`: nur lesen, optional fuer Tests oder Support

## Zugriffsschutz

Die App darf nie nur lokal entscheiden, welche Daten ein Nutzer sehen darf. Die Datenbank muss jede Abfrage serverseitig ueber Regeln absichern:

- Nutzer sieht nur Datensaetze, deren `family_id` in seinen Mitgliedschaften enthalten ist.
- Schreibzugriff haengt von der Rolle in `family_members` ab.
- Einladungen laufen ueber einmalige Tokens und koennen ablaufen.
- Supportzugriff wird nicht standardmaessig erlaubt.

## Umsetzungsschritte

1. Lokale App-Datenstruktur stabilisieren.
2. Persistente lokale Speicherung einbauen.
3. Supabase-Projekt anlegen.
4. Tabellen und Zugriffregeln definieren.
5. Login und Familienbeitritt integrieren.
6. Sync-Schicht zwischen App-State und Backend bauen.
7. Offline-Konflikte entscheiden: letzte Aenderung gewinnt oder bewusstes Zusammenfuehren.
