# Homely Abgleich: 7 Konzepte

Stand: 2026-07-12

Dieser Abgleich ersetzt die fruehere Zwischenliste und bewertet den aktuellen Stand nach den letzten Umsetzungen. Ziel ist eine klare Sicht darauf, was fuer den bezahlwuerdigen MVP bereits in der App steckt und was vor oder nach dem naechsten Testpaket noch offen ist.

## 1. Zuverlaessige Erinnerungen: gut unterwegs

Erfuellt:

- Backend, Cron, `notification_log`, Expo Push und App-Opt-in sind vorhanden.
- Die App hat eine Testbenachrichtigung unter `Mehr > Konto > Push`.
- Ruhezeiten sind in der App steuerbar und werden serverseitig beim Claim faelliger Aufgabenerinnerungen beruecksichtigt.
- Nutzer koennen Aufgaben-Erinnerungen, Aenderungshinweise, ueberfaellige Aufgaben und Haushaltsstatus getrennt aktivieren.
- Ueberfaellig-Erinnerungen sind als taegliche Zusammenfassung vorbereitet.
- Haushaltsstatus fuer Verwalter und Gruender ist als eigener Dispatch-Fall vorbereitet.

Offen:

- Migration `0012_notification_dispatch_expansion.sql` muss in Supabase ausgefuehrt werden.
- Edge Function `send-task-reminders` muss nach Migration `0012` neu deployed werden.
- Eine Tagesuebersicht, z. B. morgens `Heute stehen 3 Aufgaben an`, ist noch zu konzipieren.
- Echter Samsung-/Play-Test fuer Zustellung, Token, Ruhezeiten und keine doppelten Erinnerungen steht aus.

## 2. Richtig guter Erststart: gut unterwegs

Erfuellt:

- Neuer Erststart nutzt neutrale Daten statt private Demo-Namen.
- Haushalt, Gruender, Mitglieder und Musteraufgabenpakete sind Teil des Startflows.
- Haushaltstypen fuer Familie, WG, Paar und Haus setzen passende Paketvorschlaege.
- Die Startplan-Vorschau zeigt Aufgabenanzahl, Punkte und aktive Pakete vor dem Start.
- Nutzer starten nicht mehr mit allen Excel-Aufgaben, sondern mit bewusst gewaehlten Paketen.

Offen:

- Der OnboardingWizard braucht noch einen staerkeren Abschlussmoment wie `Dein Wochenplan ist bereit`.
- Konto, Sync und Einladung sollten nach dem lokalen Start noch sanfter als naechster Schritt angeboten werden.
- Defaults je Haushaltstyp sollten nach echten Tests weiter geschaerft werden.

## 3. Weniger Verwaltungsgefuehl: gut unterwegs

Erfuellt:

- Homely startet fuer regelmaessige Nutzer auf `Heute`.
- Normale Mitglieder sehen zuerst eigene Aufgaben und koennen auf Haushaltshilfe erweitern.
- `Heute` zeigt offene Aufgaben, erledigte Aufgaben, offene Punkte und einen Fokus auf den aktuellen Tag.
- `Heute` gruppiert sichtbare Aufgaben in `Jetzt wichtig`, `Spaeter heute` und `Erledigt`.
- Sync-Fehler und technische Hinweise werden ruhiger dargestellt; lokale Aenderungen bleiben nachvollziehbar.
- Wochenansicht und Sync haben bessere Leer- und Fehlerzustaende.

Offen:

- Technische Supabase-Texte sollten konsequent aus Konto/Alltag in Diagnose und Check verschoben werden.
- Wiederkehrende Nutzer sollten noch weniger Einstellungen sehen, wenn sie nichts verwalten muessen.

## 4. Intelligente Aufgabenverteilung: deutlich weiter

Erfuellt:

- Fairness erkennt Lasten und zeigt einen Entlastungsvorschlag.
- Aufgabenbearbeitung bietet `Fair verteilen` mit Vorschau und bestaetigungspflichtiger Uebernahme.
- Der Vorschlag verteilt anhand aktueller Wochenlast und zaehlt die bearbeitete Aufgabe nicht doppelt.
- `Uebliche Zustaendigkeit` ist vorhanden, z. B. fuer Waesche, Keller, Getraenke oder andere Standardaufgaben.
- Uebliche Zustaendigkeit veraendert offene Zukunftstermine ab gewaehlter KW; erledigte Historie bleibt erhalten.

Offen:

- Rollenfaehigkeit fehlt noch, z. B. wer bestimmte Aufgaben grundsaetzlich machen kann oder darf.
- Praeferenzen fehlen noch, z. B. mag Kochen, hasst Bad, kann nur Wochenende.
- Historie ueber mehrere Wochen sollte die Vorschlaege verbessern.
- Ein globaler `Plan fairer machen`-Flow fuer mehrere Aufgaben gleichzeitig ist noch offen.

## 5. Fairness als emotionales Kernversprechen: gut unterwegs

Erfuellt:

- Fairness zeigt Soll, Plan und Ist je Person.
- Fairness zeigt Soll, Plan und Ist je Person als Balken.
- Homely klassifiziert Lasten und formuliert Hinweise entlastend statt beschuldigend.
- Verwalter sehen Diagnose und optionalen Entlastungsvorschlag.
- Wochenverlauf zeigt die Spanne der letzten sichtbaren Wochen.
- Nach erledigten Aufgaben erscheint ein kurzer Danke-Moment im Heute-Flow.

Offen:

- Fairness sollte noch staerker als emotionales Versprechen im Alltag auftauchen, nicht nur im Fairness-Tab.

## 6. Kalender- und Jahresmodus: gut unterwegs

Erfuellt:

- Aufgaben-Langzeituebersicht ist vorhanden und nutzt den vollstaendigen Plan.
- Essensplan hat eine langfristige Sicht.
- Eigene Aufgaben koennen `alle X Wochen`, monatlich und jaehrlich geplant werden.
- Intervall, Tag und Monat werden lokal gespeichert und ueber Supabase-Sync vorbereitet.
- Tagesansicht bleibt leicht, Langzeitplanung ist als Verwalterwerkzeug angelegt.

Offen:

- Monats- und Jahreskalender fehlen noch.
- Urlaub, Ferien, saisonale Aufgaben und Muelltermine fehlen noch.
- Langfristige Planung braucht spaeter Filter nach Person, Aufgabe und Haushalt.
- Optionale Erweiterung ist konzipiert: Muelltermine als Terminserien, Urlaub/Ferien als Sperrzeiten mit Planverschiebung oder Pausierung.

## 7. Polierte Details: gut unterwegs

Erfuellt:

- Safe-Areas fuer Android/Samsung wurden beruecksichtigt.
- Leerzustaende, Bestatigungen, Checkbereich und Release-Gates sind vorhanden.
- Undo nach Aufgabenloeschung ist vorhanden und stellt Aufgaben samt Zuordnungen wieder her.
- `StateMessage`, `EmptyState` und `UndoToast` vereinheitlichen Leer-, Fehler-, Sync- und Rueckgaengig-Hinweise in den Hauptflows.
- Sync-Lade- und Fehlerhinweise erklaeren ruhig, dass lokale Aenderungen erhalten bleiben.
- Push-Testbenachrichtigung ist vorhanden.

Offen:

- Ein eigener `LoadingState` fuer laengere Ladeflaechen fehlt noch; kleinere Lade- und Sync-Zustaende nutzen bereits `StateMessage`.
- Offline- und Konflikthinweise brauchen spaeter eine echte Loesungslogik mit Auswahl, nicht nur Erklaerung.
- Samsung-Visual-QA sollte pro Release feste Screenshots fuer Heute, Aufgaben, Essen, Fairness und Mehr enthalten.
- Kleine Texte und Buttons sollten nach echten Geraetetests weiter gegen Umbrueche gehaertet werden.

## Aktualisierte naechste Reihenfolge

1. Migration `0012_notification_dispatch_expansion.sql` ausfuehren und `send-task-reminders` neu deployen.
2. Geraetetest mit aktuellem Stand: Heute, Aufgaben, Fairness, Essen, Mehr, Push-Test, Ueberfaellig-Push, Haushaltsstatus und Sync.
3. Wiederverwendbare UI-Zustaende und Offline-/Konfliktlogik vereinheitlichen.
4. Manuelle Kalenderereignisse fuer Muell als Aufgabenserie vorbereiten.
