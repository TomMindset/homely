# Homely Design-Qualitaetsstandard

Stand: 2026-07-04

Ziel: Homely soll sich wie eine ruhige, moderne Android-Produktivitaets-App anfuehlen: klar, verlaesslich, alltagstauglich und store-reif. Dieser Standard verbindet Material Design 3, Android Core App Quality, WCAG 2.2 und Google-Play-Release-Erwartungen mit konkreten Homely-Regeln.

## Leitprinzipien

1. **Persoenlich zuerst, Haushalt danach**
   - Heute und Woche starten aus Sicht der aktiven Person.
   - Haushalt, Fairness und alle Aufgaben bleiben erreichbar, aber nicht dominierend.
   - Texte sagen klar, ob etwas "meine" Aufgaben oder "alle" Aufgaben meint.

2. **Eine Hauptabsicht pro Screen**
   - Heute: erledigen.
   - Woche: ueberblicken und vorausschauen.
   - Fairness: Soll, Plan und Ist vergleichen.
   - Essen: planen, bearbeiten und tauschen.
   - Aufgaben: Vorlagen und Regeln verwalten.
   - Mehr: Konto, Sync, Haushalt, Design und Release-Check.

3. **Ruhige Produktivitaet statt Deko**
   - Keine dekorativen Ueberladungen.
   - Karten nur fuer einzelne wiederholte Elemente, Einstellungen oder abgegrenzte Werkzeuge.
   - Keine verschachtelten Karten.
   - Wenige starke Akzentfarben, klare Statusfarben.

4. **Vertrauen vor Tempo**
   - Konto, Sync, Loeschung und Einladungen brauchen klare Rueckmeldung.
   - Fehler duerfen nicht still passieren.
   - Loeschaktionen brauchen Bestaetigung und erklaeren, ob lokal oder Cloud betroffen ist.

## Screen-Standards

### Heute

- Standardansicht: eigene Aufgaben der aktiven Person.
- Umschalter: `Meine` und `Alle`.
- Jede Aufgabe zeigt Titel, zuständige Person, Rhythmus, Erinnerung und Punkte.
- Wenn eine andere Person erledigt, wird `erledigt von ...` sichtbar.
- Leerer Zustand: freundlich und eindeutig, z. B. "Fuer diese Auswahl sind heute keine Aufgaben geplant."

### Woche

- Standardansicht: eigene Woche.
- Umschalter: `Meine`, `Alle`, `Tage`.
- Kennzahlen muessen zur aktuellen Auswahl passen.
- Kommende Wochen zeigen offene Aufgaben, erledigte Aufgaben und Punkte.
- Tagesmodus darf nicht wie eine zweite Tagesansicht unter der Woche wirken, sondern als Untermenue.

### Fairness

- Anzeige: Soll, Plan und Ist pro Person.
- Plan = zugeordnete Punkte.
- Ist = offene Aufgaben bei zugeordneter Person, erledigte Aufgaben bei erledigender Person.
- Abweichung wird farblich unterstuetzt, aber nicht nur ueber Farbe vermittelt.
- Neu zuordnen nur fuer Gruender und Verwalter.

### Essen

- Wochenmodus: editieren, Koch-Person setzen, tauschen.
- Langfristmodus: kommende Wochen scannen und Tauschziel waehlen.
- Leere Mahlzeiten wirken geplant offen, nicht kaputt.
- Bearbeiten nur fuer Gruender und Verwalter.

### Aufgaben

- Neue Aufgabe: Titel, Punkte, Wiederholung, Wochentage, Erinnerung.
- Bestehende Aufgabe: Titel, Punkte und Erinnerung editierbar.
- Eigene Aufgaben: Wiederholungsregel editierbar.
- Loeschen braucht Bestaetigung.
- Mitglieder ohne Verwaltungsrolle duerfen die Verwaltung sehen, aber nicht bedienen.

### Haushalt

- Haushalt ist neutral formuliert: Familie, WG oder Haushalt.
- Keine privaten Demo-Namen nach Onboarding.
- Personen: Name, Kuerzel, Rolle, Farbe.
- Mindestens eine verwaltende Person muss erhalten bleiben.
- Datenschutztext erklaert lokal und optional Cloud-Sync.

### Mehr / Einstellungen

- Sichtbarer Sync-Status: lokal, synchronisiert, synchronisiert gerade oder Fehler.
- Konto-Aktionen geben klare Rueckmeldung.
- Einladungen erklaeren den aktuellen Code-Flow.
- Design und Darkmode wirken auf die gesamte App.
- Release-Check zeigt Store-Gates, nicht nur technische Checks.

## Android-Qualitaet

- App respektiert Statusleiste und Systemnavigation.
- Bottom Navigation ueberlappt nicht mit Android-Steuerung.
- App pausiert/resumiert stabil bei App-Wechsel, Sperren und Entsperren.
- Zustand bleibt beim Zurueckkehren erhalten.
- Texte werden nicht abgeschnitten und ueberlappen nicht.
- Lange Woerter und lange Aufgaben passen in Karten.
- Touch-Ziele sind ausreichend gross, besonders Navigation, Tageschips, Checkboxen und Aktionsbuttons.
- Darkmode nutzt echte dunkle Flaechen, nicht nur invertierte Einzelteile.

## Accessibility

- Textkontrast muss in Hell- und Dunkelmodus lesbar sein.
- Status darf nie nur ueber Farbe kommuniziert werden.
- Buttons brauchen klare Beschriftungen.
- Fehlermeldungen nennen Ursache und naechste Handlung.
- Schrift darf bei groesseren Systemeinstellungen nicht aus Buttons laufen.
- Relevante Icons brauchen Text oder einen klaren Kontext.
- Kleine interaktive Elemente werden vermieden.

## Store-Screenshot-Standard

Fuer Google Play sollten echte Kernflows sichtbar sein:

1. Heute: eigene Aufgaben und Essen.
2. Woche: eigene/alle Aufgaben mit Kennzahlen.
3. Fairness: Soll, Plan und Ist.
4. Essen: Wochenplan oder langfristiger Plan.
5. Mehr/Konto: Sync-Status und Haushalts-Sync.

Screenshots sollen keine privaten Echtdaten zeigen. Testhaushalt und Testpersonen verwenden.

## Homely Design-Check Vor Release

Vor jedem Store-Build:

- `pnpm run check`
- `pnpm run build:preflight`
- Samsung-Test: Header, Footer, Bottom Navigation, Darkmode.
- Mehrkonto-Test: Gruender, Verwalter, Mitglied.
- Accessibility-Sichtpruefung: Kontrast, Schriftgroesse, Touch-Ziele.
- Store-Screenshot-Sichtpruefung: echte App, keine privaten Daten.

## Quellen

- Material Design 3: https://m3.material.io/
- Android Core App Quality: https://developer.android.com/docs/quality-guidelines/core-app-quality
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- Google Play Release Guide: https://play.google.com/console/about/guides/releasewithconfidence/
