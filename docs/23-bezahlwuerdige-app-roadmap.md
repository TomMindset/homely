# Homely Roadmap: Bezahlwuerdige App

Stand: 2026-07-11

Ziel: Homely soll nicht nur Aufgaben verwalten, sondern Alltagsstress reduzieren. Die App wird dann bezahlwuerdig, wenn neue Nutzer schnell starten, regelmaessige Nutzer sofort ihre Aufgaben sehen und Verwalter faire Entscheidungen treffen koennen.

## 1. Zuverlaessige Erinnerungen

- Push-Grundlage ist vorhanden: Opt-in, Expo Push Token, Supabase-Tabellen und RLS.
- Serverseitiger Versand ist vorbereitet: `send-task-reminders`, `notification_log`, Claim-RPC und Cron-Dokumentation.
- Naechster Schritt: Function deployen, Secret setzen, Cron aktivieren und Samsung-Endtest.
- Erinnerungsarten: Tagesstart, Aufgabe zur Uhrzeit, Vortag, ueberfaellig, Haushaltsstatus fuer Verwalter.
- UX-Regel: wenige, relevante Hinweise statt Benachrichtigungsflut.
- Testpflicht: Token registrieren, Testbenachrichtigung, Deaktivierung, keine doppelten Erinnerungen.

## 2. Richtig guter Erststart

- Onboarding bleibt kurz: Haushalt, Gruender, Mitglieder, Musteraufgabenpakete.
- Nutzer waehlen Aufgabenpakete statt einzelne Aufgabenlisten zu pflegen.
- Homely startet danach auf `Heute` mit einem sichtbaren Plan.
- Einladung bleibt eigener Flow: erst Konto, dann Einladungscode.

## 3. Weniger Verwaltungsgefuehl

- `Heute` ist der Standard-Startpunkt fuer regelmaessige Nutzer.
- Normale Mitglieder sehen zuerst eigene Aufgaben.
- Verwalter erhalten klare Einstellbereiche fuer Haushalt, Aufgaben, Sync, Push und Check.
- Technische Fehler bleiben im Diagnose-/Checkbereich; Alltagstexte bleiben ruhig und konkret.

## 4. Intelligente Aufgabenverteilung

- Homely soll Vorschlaege machen: fair verteilen, ueberlastete Personen erkennen, Tausch vorschlagen.
- Scoring-Basis: Soll-Punkte, Plan-Punkte, Ist-Punkte, Historie, Rollenfaehigkeit und Wiederholung.
- Vorschlaege muessen erklaerbar sein: warum diese Aufgabe zu dieser Person passt.
- Nutzer bestaetigen Vorschlaege vor dem Speichern.

## 5. Fairness als Kernversprechen

- Fairness wird emotionaler: weniger Tabelle, mehr Haushaltsgefuehl.
- Beispiele: `Diese Woche ist ausgeglichen`, `Tom traegt gerade mehr`, `Entlastung moeglich`.
- Zahlen bleiben sichtbar: Soll, Plan und Ist je Person.
- Tonalitaet: nicht beschuldigend, sondern entlastend.

## 6. Kalender- und Jahresmodus

- Homely braucht Planung ueber die aktuelle Woche hinaus.
- Wiederholungen: taeglich, Wochentage, alle X Wochen, monatlich, jaehrlich.
- Besonderheiten: Urlaub, Ferien, saisonale Aufgaben, Muelltermine.
- UX-Regel: Tagesansicht bleibt leicht, Kalender ist ein Verwalter-Werkzeug.

## 7. Polierte Details

- Undo nach Loeschen.
- Lade-, Fehler- und Leerzustaende fuer alle Hauptflows.
- Offline-/Sync-Konflikte verstaendlich erklaeren.
- Keine Textueberlaeufe auf Samsung-Groessen.
- App-Version, Diagnose und Release-Check bleiben sichtbar fuer Tests.

## 8. Musteraufgabenpakete

Musterpakete sind der wichtigste Hebel fuer einen leichten Start. Nutzer sollen nicht mit 20+ Aufgaben erschlagen werden.

Aktive Pakete:

- `Basis-Haushalt`: Kueche, Spuelmaschine, Muell, Bad, Staubsaugen.
- `Familienalltag`: Waesche, Zimmer, Getraenke, Einkauf.
- `WG & geteilter Haushalt`: gemeinsame Kuechen-, Muell-, Bad- und Flaechenaufgaben.
- `Groessere Reinigung`: Wischen, Staub, Entkalken, Fenster.
- `Essen & Einkauf`: Kochen, Einkauf, Getraenke.
- `Saison & Extras`: Blumen, Kompost, Auto und seltene Extras.

Umsetzungsregel:

- Beim Erststart werden nur gewaehlte Pakete aktiviert.
- Nicht gewaehlte Standardaufgaben bleiben ausgeblendet.
- Verwalter koennen Vorlagen spaeter wiederherstellen und danach bearbeiten.
- Kuenftig sollen Pakete auch nachtraeglich unter `Aufgaben` anpassbar werden.

## Prioritaet

1. Push-Versand fuer faellige Aufgaben.
2. Onboarding mit Musteraufgabenpaketen stabilisieren.
3. `Heute` als Alltagsschaltzentrale ausbauen.
4. Fairness-Insights emotionalisieren.
5. Intelligente Aufgabenverteilung.
6. Kalender- und Jahresmodus.
7. Polish-Schicht pro Release.
