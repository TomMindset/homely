# Homely Roadmap: Bezahlwuerdige App

Stand: 2026-07-12

Ziel: Homely soll nicht nur Aufgaben verwalten, sondern Alltagsstress reduzieren. Die App wird dann bezahlwuerdig, wenn neue Nutzer schnell starten, regelmaessige Nutzer sofort ihre Aufgaben sehen und Verwalter faire Entscheidungen treffen koennen.

## 1. Zuverlaessige Erinnerungen

- Push-Grundlage ist vorhanden: Opt-in, Expo Push Token, Supabase-Tabellen und RLS.
- Serverseitiger Versand ist aktiv: `send-task-reminders`, `notification_log`, Claim-RPC, `HOMELY_REMINDER_SECRET` und Cron alle 5 Minuten.
- Nutzersteuerung ist vorhanden: Testbenachrichtigung, Aufgaben-Erinnerungen, Aenderungshinweise, ueberfaellige Aufgaben, Haushaltsstatus und Ruhezeiten.
- Ruhezeiten werden serverseitig beim Claim faelliger Aufgabenerinnerungen beruecksichtigt.
- Naechster Schritt: Samsung-Endtest zusammen mit den naechsten Geraete- und Play-Tests.
- Erinnerungsarten: Aufgabe zur Uhrzeit ist aktiv, Vortag wird ueber `reminder_lead_days` abgebildet, ueberfaellig und Haushaltsstatus sind als Preference vorbereitet.
- UX-Regel: wenige, relevante Hinweise statt Benachrichtigungsflut.
- Testpflicht: Token registrieren, Testbenachrichtigung, Deaktivierung, keine doppelten Erinnerungen.

## 2. Richtig guter Erststart

- Onboarding bleibt kurz: Haushalt, Gruender, Mitglieder, Musteraufgabenpakete.
- Startprofile fuer Familie, WG, Paar und Haus setzen passende Paketvorschlaege.
- Eine Startplan-Vorschau zeigt Aufgabenanzahl, Punkte und aktive Pakete vor dem Start.
- Nutzer waehlen Aufgabenpakete statt einzelne Aufgabenlisten zu pflegen.
- Homely startet danach auf `Heute` mit einem sichtbaren Plan.
- Einladung bleibt eigener Flow: erst Konto, dann Einladungscode.

## 3. Weniger Verwaltungsgefuehl

- `Heute` ist der Standard-Startpunkt fuer regelmaessige Nutzer.
- Normale Mitglieder sehen zuerst eigene Aufgaben.
- `Heute` zeigt eine Fokuskarte mit offenen Aufgaben, erledigten Aufgaben, offenen Punkten und der Option, im Haushalt zu helfen.
- Verwalter erhalten klare Einstellbereiche fuer Haushalt, Aufgaben, Sync, Push und Check.
- Technische Fehler bleiben im Diagnose-/Checkbereich; Alltagstexte bleiben ruhig und konkret.

## 4. Intelligente Aufgabenverteilung

- Homely soll Vorschlaege machen: fair verteilen, ueberlastete Personen erkennen, Tausch vorschlagen.
- Scoring-Basis: Soll-Punkte, Plan-Punkte, Ist-Punkte, Historie, Rollenfaehigkeit und Wiederholung.
- Vorschlaege muessen erklaerbar sein: warum diese Aufgabe zu dieser Person passt.
- Nutzer bestaetigen Vorschlaege vor dem Speichern.
- Aufgabenbearbeitung zeigt pro Aufgabe einen `Fair verteilen`-Vorschlag fuer die gewaehlte KW.
- Der Vorschlag berechnet die niedrigste aktuelle Planlast ohne die bearbeitete Aufgabe doppelt zu zaehlen.

## 5. Fairness als Kernversprechen

- Fairness wird emotionaler: weniger Tabelle, mehr Haushaltsgefuehl.
- Beispiele: `Diese Woche ist ausgeglichen`, `Tom traegt gerade mehr`, `Entlastung moeglich`.
- Zahlen bleiben sichtbar: Soll, Plan und Ist je Person.
- Homely zeigt eine Fairness-Diagnose, Last-Klassifizierung pro Person und einen optionalen Entlastungsvorschlag fuer Verwalter.
- Tonalitaet: nicht beschuldigend, sondern entlastend.

## 6. Kalender- und Jahresmodus

- Homely braucht Planung ueber die aktuelle Woche hinaus.
- Aufgaben-Langzeituebersicht zeigt die kommenden 12 Wochen aus dem vollstaendigen Plan.
- Wiederholungen: taeglich, Wochentage, alle X Wochen, monatlich, jaehrlich.
- Besonderheiten: Urlaub, Ferien, saisonale Aufgaben, Muelltermine.
- UX-Regel: Tagesansicht bleibt leicht, Kalender ist ein Verwalter-Werkzeug.

## 7. Polierte Details

- Undo nach Aufgaben-Loeschen ist vorhanden und stellt Zuordnungen wieder her.
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
- Pakete koennen nachtraeglich unter `Aufgaben > Bearbeiten` gezielt aktiviert werden.

## Prioritaet

1. Push-Versand fuer faellige Aufgaben auf Samsung endtesten.
2. Onboarding mit Musteraufgabenpaketen im Geraetetest stabilisieren.
3. `Heute` als Alltagsschaltzentrale auf Samsung gegen echte Haushaltsdaten testen.
4. Fairness-Insights auf Samsung gegen echte Haushaltsdaten testen.
5. Intelligente Aufgabenverteilung.
6. Kalender- und Jahresmodus.
7. Polish-Schicht pro Release.
