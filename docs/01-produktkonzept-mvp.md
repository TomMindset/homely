# Homely: Haushalts Manager - Produktkonzept und MVP

Stand: 2026-07-02
Quelle: `Familienplaner.xlsx`

## 1. Produktidee

Die App hilft Familien, wiederkehrende Haushaltsaufgaben fair, sichtbar und spielerisch zu verteilen. Sie ersetzt starre Tabellenplaene durch einen lebendigen Wochenplan: Aufgaben werden nach Aufwand gewichtet, automatisch oder manuell verteilt, von Familienmitgliedern abgehakt und in einer Fairness-Uebersicht ausgewertet.

Der Kern ist nicht "To-do-Liste", sondern "Familien-Fairness mit Spielgefuehl": Jede Person sieht, was heute ansteht, welchen Beitrag sie leistet und wie ausgewogen die Woche oder der Monat verteilt ist.

## 2. Ausgangspunkt aus der Excel

Die bestehende Excel enthaelt bereits ein starkes Regelmodell:

- Aufgaben mit Aufwandseinheiten
- Kalenderwochen von KW30 bis KW52
- Familienmitglieder ueber Kuerzel: Aaron `A`, Cedrik `C`, Danielle `D`, Sonja `S`, Tom `T`
- Kategorien:
  - taegliche Taetigkeiten
  - 2x pro Woche
  - woechentliche Taetigkeiten
  - laengerfristige Taetigkeiten
- Essensplan pro Kalenderwoche und Wochentag
- Summenlogik fuer gerechte Verteilung

Aus der Excel sichtbare Gesamtwerte:

| Kennzahl | Wert |
|---|---:|
| Gesamtaufwand | 1689 Einheiten |
| Ziel pro Kopf | 337,8 Einheiten |
| Ziel pro Kopf und Woche | ca. 14,69 Einheiten |
| Sonja | 543 Einheiten |
| Tom | 277 Einheiten |
| Danielle | 324 Einheiten |
| Cedrik | 242 Einheiten |
| Aaron | 297 Einheiten |

Wichtiger technischer Hinweis: In den Wochenblaettern sind Aufgabenbezeichnungen teilweise als Excel-Textfelder gespeichert, nicht als normale Zellwerte. Fuer einen Import muessen diese Inhalte explizit extrahiert und normalisiert werden.

## 3. Zielgruppe

Primaere Zielgruppe:

- Familien mit Kindern oder Jugendlichen, die Aufgaben fairer verteilen wollen
- Eltern, die nicht alles selbst koordinieren wollen
- Haushalte, in denen wiederkehrende Aufgaben, Essen, Putzen, Waesche und Muellorganisation zusammenkommen

Sekundaere Zielgruppe:

- WGs
- Patchwork-Familien
- Haushalte mit pflege- oder betreuungsbezogenen Routinen

## 4. Produktversprechen

"Alle sehen, was zu tun ist. Aufgaben werden fair verteilt. Erledigen fuehlt sich nach Fortschritt an."

MVP-Versprechen:

- Heute wissen alle, was sie erledigen sollen.
- Die Familie sieht, ob die Aufgaben fair verteilt sind.
- Wiederkehrende Aufgaben muessen nicht jede Woche neu geplant werden.
- Kinder und Erwachsene bekommen ein leichtes Spielgefuehl ohne komplizierte Regeln.

## 5. MVP-Funktionsumfang

### Muss im MVP enthalten sein

1. Familienprofil
   - Familie anlegen
   - Mitglieder anlegen
   - Name, Farbe, optional Avatar/Icon
   - Rolle: Elternteil, Kind, anderes Mitglied

2. Aufgabenstamm
   - Aufgabe anlegen und bearbeiten
   - Kategorie
   - Aufwand in Einheiten
   - Wiederholung: taeglich, bestimmte Wochentage, x-mal pro Woche, alle n Tage/Wochen
   - optional Saison/Zeitraum, z. B. "Blumen giessen im Sommer"

3. Wochenplan
   - Kalenderwochenansicht
   - Tagesansicht
   - Aufgaben sind Personen zugewiesen
   - Aufgabe abhaken
   - Aufgabe verschieben oder neu zuweisen

4. Fairness-Uebersicht
   - Punkte/Einheiten pro Person
   - Soll-Ist-Vergleich
   - Anzeige, wer diese Woche viel oder wenig uebernommen hat
   - keine beschämende Rangliste im MVP, sondern konstruktive Balance-Anzeige

5. Essensplan
   - Essen pro Tag eintragen
   - Koch/Koechin zuweisen
   - Wochenuebersicht

6. Basis-Gamification
   - Punkte entsprechen Aufgabeinheiten
   - Wochenfortschritt
   - kleine Abzeichen fuer "alle Tagesaufgaben erledigt", "Woche geschafft", "fair verteilt"
   - Familienziel statt nur Einzelwettbewerb

### Sollte bald nach dem MVP kommen

- Tausch-Anfragen: "Kann jemand meine Aufgabe uebernehmen?"
- Push-Erinnerungen
- Vorlagen fuer typische Haushaltsaufgaben
- Wochen automatisch neu ausbalancieren
- Import aus Excel als einmaliger Migrationsweg
- Wiederkehrende Einkaufs-/Essensideen

### Nicht im MVP

- Komplexer Chat
- Bezahlmodell
- Mehrere Haushalte pro Nutzer
- Vollstaendige Kalenderintegration
- KI-basierte Aufgabenverteilung
- Oeffentliche Bestenlisten
- Umfangreiche Rezeptdatenbank

## 6. Kern-User-Flows

### Flow 1: Familie startet

1. Nutzer erstellt eine Familie.
2. Nutzer legt Familienmitglieder an.
3. App schlaegt Beispielaufgaben vor.
4. Nutzer uebernimmt, loescht oder bearbeitet Aufgaben.
5. App erzeugt den ersten Wochenplan.

### Flow 2: Tagesnutzung

1. Familienmitglied oeffnet die App.
2. Es sieht "Heute" mit den eigenen Aufgaben.
3. Aufgabe wird abgehakt.
4. Punkte/Einheiten werden gutgeschrieben.
5. Familienfortschritt aktualisiert sich.

### Flow 3: Wochenplanung

1. Elternteil oder Planungsverantwortliche Person oeffnet Wochenansicht.
2. App zeigt alle wiederkehrenden Aufgaben.
3. Aufgaben koennen per Drag-and-drop oder Auswahl neu verteilt werden.
4. Fairness-Anzeige zeigt Auswirkungen.
5. Plan wird fuer die Woche bestaetigt.

### Flow 4: Essensplanung

1. Familie oeffnet Essensplan.
2. Pro Tag wird ein Gericht eingetragen.
3. Optional wird eine kochende Person zugewiesen.
4. "Essen zubereiten" kann als Aufgabe im Wochenplan erscheinen.

## 7. Datenmodell fuer den MVP

### Family

| Feld | Typ | Beschreibung |
|---|---|---|
| id | string | eindeutige ID |
| name | string | Familienname oder Haushaltsname |
| weekStartDay | enum | z. B. `monday` |
| createdAt | datetime | Erstellung |

### Member

| Feld | Typ | Beschreibung |
|---|---|---|
| id | string | eindeutige ID |
| familyId | string | Referenz auf Familie |
| name | string | Anzeigename |
| shortCode | string | z. B. `A`, `C`, `D`, `S`, `T` |
| color | string | Profilfarbe |
| role | enum | `adult`, `child`, `other` |
| active | boolean | nimmt an Planung teil |

### TaskTemplate

| Feld | Typ | Beschreibung |
|---|---|---|
| id | string | eindeutige ID |
| familyId | string | Referenz auf Familie |
| title | string | z. B. "Kueche reinigen" |
| category | enum | `daily`, `twice_weekly`, `weekly`, `long_term`, `meal`, `custom` |
| effortUnits | number | Aufwandspunkte |
| defaultAssigneeId | string/null | optionale Standardperson |
| active | boolean | Aufgabe aktiv |

### ScheduleRule

| Feld | Typ | Beschreibung |
|---|---|---|
| id | string | eindeutige ID |
| taskTemplateId | string | Referenz auf Aufgabe |
| frequencyType | enum | `daily`, `weekly_days`, `times_per_week`, `interval_days`, `seasonal` |
| weekdays | array | z. B. `["monday", "friday"]` |
| timesPerWeek | number/null | z. B. `2` |
| intervalDays | number/null | z. B. `28`, `56`, `175` |
| seasonStart | date/null | optional |
| seasonEnd | date/null | optional |

### Assignment

| Feld | Typ | Beschreibung |
|---|---|---|
| id | string | eindeutige ID |
| familyId | string | Referenz auf Familie |
| taskTemplateId | string | Referenz auf Aufgabe |
| assigneeId | string | verantwortliches Mitglied |
| date | date | konkreter Tag |
| calendarWeek | number | Kalenderwoche |
| effortUnits | number | eingefrorener Aufwand fuer diese Instanz |
| status | enum | `open`, `done`, `skipped`, `moved` |
| completedAt | datetime/null | Erledigungszeitpunkt |
| completedByMemberId | string/null | wer abgehakt hat |

### MealPlanEntry

| Feld | Typ | Beschreibung |
|---|---|---|
| id | string | eindeutige ID |
| familyId | string | Referenz auf Familie |
| date | date | Tag |
| calendarWeek | number | Kalenderwoche |
| mealTitle | string | z. B. "Lasagne" |
| cookMemberId | string/null | verantwortliche Person |

### BadgeEvent

| Feld | Typ | Beschreibung |
|---|---|---|
| id | string | eindeutige ID |
| familyId | string | Referenz auf Familie |
| memberId | string/null | einzelne Person oder Familie |
| type | enum | `day_complete`, `week_complete`, `fair_week`, `streak` |
| createdAt | datetime | Zeitpunkt |

## 8. Import-Mapping aus der Excel

### Uebersichtsplaner

- Spalte A: Aufgabenname
- Spalte B: Einheiten/Aufwand
- Spalten C bis Y: KW30 bis KW52 mit Personenkuerzeln
- Spalte Z: Gesamt-Einheiten
- Spalte AA: Einheiten pro Woche oder normierter Wochenwert
- Spalten AB bis AF: Verteilung auf Personen
- Zeilen 38 bis 42: Legende Personen/Kuerzel

### Wochenblaetter

- Blattname `KWxx` bestimmt Kalenderwoche
- Spalten B bis H entsprechen Montag bis Sonntag
- Zellen enthalten Personenkuerzel
- Aufgabenbezeichnungen muessen aus Zeichnungs-/Textfeldinhalten extrahiert werden

### Essensplan

- Spalte A: Kalenderwoche
- Spalte B: Wochentag
- Spalte C: Essen
- Spalte D: Koch/Koechin

## 9. Erste UX-Struktur

### Hauptnavigation

1. Heute
   - persoenliche Tagesaufgaben
   - Familienfortschritt
   - heutiges Essen

2. Woche
   - Wochenraster Montag bis Sonntag
   - Aufgaben pro Person
   - schnelle Umverteilung

3. Fairness
   - Einheiten pro Person
   - Soll-Ist-Abweichung
   - Wochen- und Monatsblick

4. Essen
   - Essensplan
   - Koch/Koechin

5. Aufgaben
   - Aufgabenstamm
   - Wiederholungen
   - Aufwandseinheiten

## 10. Spielmechanik

Die Spielmechanik soll motivieren, aber nicht Druck erzeugen.

MVP-Mechaniken:

- Einheiten werden als Punkte sichtbar.
- Jede erledigte Aufgabe fuellt den Familien-Wochenbalken.
- Es gibt ein Familienziel: "Diese Woche gemeinsam schaffen".
- Fairness wird als Balance angezeigt, nicht als Schuldzuweisung.
- Abzeichen belohnen Zusammenarbeit, nicht nur Einzelspitzen.

Bewusste Produktentscheidung:

- Keine oeffentliche Rangliste im MVP.
- Keine Strafpunkte im MVP.
- Keine manipulativen Streaks, die Kinder oder Eltern unter Druck setzen.

## 11. Store-Positionierung

Markenentscheidung:

- Store-Titel: `Homely: Haushalts Manager`
- App-Kurzname: `Homely`
- Claim: `Aufgaben, Essen und Fairness fuer Familien.`
- FairFamily

Moegliche Store-Kategorie:

- Produktivitaet
- Familie
- Lifestyle

Kurzbeschreibung:

"Plant Haushaltsaufgaben, Essen und Wochenroutinen fair in der Familie - mit Punkten, Wochenzielen und klarer Tagesansicht."

Differenzierung:

- weniger Projektmanagement, mehr Familienalltag
- fairnessbasiert statt reine Checkliste
- Essensplan und Aufgabenplan in einem
- kindertaugliches Spielgefuehl ohne Wettbewerbspflicht

## 12. Offene Entscheidungen

Diese Punkte sollten wir vor dem Prototypen klaeren:

1. Soll die erste Version rein lokal auf einem Geraet funktionieren oder direkt mit Familien-Sync?
2. Sollen Kinder eigene Logins/Geraete haben oder startet der MVP mit einem Familiengeraet?
3. Soll die App deutschsprachig starten oder gleich Deutsch/Englisch?
4. Soll der Excel-Import Teil des Produkts werden oder nur unser einmaliger Migrationshelfer?
5. Soll die App eher ruhig und erwachsen wirken oder deutlich spielerischer fuer Kinder?
6. Welche Altersgruppe der Kinder ist die wichtigste?

## 13. Empfohlene MVP-Entscheidung

Fuer die erste baubare Version empfehle ich:

- Mobile App mit React Native/Expo
- Deutsch zuerst
- lokaler Demo-/Einzelhaushalt zuerst
- Datenmodell so anlegen, dass spaeter Sync moeglich ist
- Excel-Daten als Seed-Daten importieren
- Fokus auf Tagesansicht, Wochenplan, Fairness und Essensplan
- Gamification leicht halten

Diese Variante bringt schnell ein benutzbares Produkt auf den Bildschirm, ohne sofort die volle Komplexitaet von Accounts, Datenschutz, Einladungen, Push und Echtzeit-Sync zu tragen.

## 14. Erfolgskriterien fuer MVP

Der MVP ist gut genug fuer die naechste Runde, wenn:

- Eine Familie mit Mitgliedern angelegt werden kann.
- Mindestens 20 Aufgaben aus der Excel als Vorlagen vorhanden sind.
- Eine Woche automatisch oder halbautomatisch erzeugt werden kann.
- Jedes Mitglied seine Tagesaufgaben sehen kann.
- Aufgaben abgehakt werden koennen.
- Fairness nach Einheiten sichtbar ist.
- Der Essensplan pro Woche gepflegt werden kann.
- Die App auf einem Smartphone-Viewport gut bedienbar ist.

## 15. Naechster Schritt

Schritt 2 sollte ein technischer und visueller Prototyp sein:

1. App-Stack festlegen.
2. Projekt scaffolden.
3. Seed-Daten aus der Excel als JSON anlegen.
4. Erste Screens bauen:
   - Heute
   - Woche
   - Fairness
   - Essen
   - Aufgaben
5. Lokal starten und per Browser/App-Preview pruefen.
