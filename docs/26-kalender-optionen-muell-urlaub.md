# Homely Kalenderoptionen: Muell, Urlaub und Ferien

Stand: 2026-07-12

Diese Erweiterung ist optional fuer Version 1, aber wichtig fuer eine sehr starke Jahresplanung. Die Tagesansicht soll leicht bleiben; Kalenderlogik gehoert in einen Verwalterbereich.

## Zielbild

Homely erzeugt aus planbaren Ereignissen automatisch Aufgaben oder Ausnahmen:

- Muelltermine erscheinen als konkrete Aufgaben im Kalender.
- Urlaub und Ferien markieren Zeitraeume, in denen Aufgaben pausiert, verschoben oder fair anders bewertet werden.
- Nutzer sehen im Alltag nur die relevanten Aufgaben, nicht die ganze technische Kalenderlogik.

## Muelltermine

Konzept:

- Eigener Bereich `Kalender > Muell`.
- Terminserien fuer Restmuell, Bio, Papier, Gelbe Tonne, Glas und Sondermuell.
- Regeln wie `alle 2 Wochen dienstags`, `jeden 1. Montag`, `unregelmaessige Einzeltermine`.
- Erinnerung optional am Vortag oder am Abholtag.
- Zuständigkeit wie bei Aufgaben: uebliche Person, fair verteilen oder manuell.

Datenmodell spaeter:

- `calendar_series`: Titel, Typ, Farbe, Regel, Startdatum, Enddatum, Quelle.
- `calendar_occurrences`: konkret erzeugte Termine mit Datum und Status.
- `tasks` koennen aus Occurrences entstehen, z. B. `Gelbe Tonne rausstellen`.

UX:

- Verwalter richtet Serien einmal ein.
- Heute zeigt nur `Gelbe Tonne rausstellen`, wenn es wirklich relevant ist.
- Langfristig zeigt den Muellkalender als farbige Marker.

## Urlaub und Ferien

Konzept:

- Eigener Bereich `Kalender > Abwesenheiten`.
- Haushaltsweite Ferien und personenbezogener Urlaub werden getrennt.
- Pro Zeitraum kann Homely entscheiden:
  - Aufgaben pausieren.
  - Aufgaben auf eine andere Person verteilen.
  - Aufgaben auf vorher/nachher verschieben.
  - Aufgaben trotz Urlaub behalten, z. B. Pflanzen giessen.

Datenmodell spaeter:

- `availability_windows`: Person oder Haushalt, Start, Ende, Typ, Planregel.
- `assignment_exceptions`: konkrete Aenderungen an erzeugten Aufgaben.

UX:

- Beim Eintragen fragt Homely knapp: `Was soll mit Toms Aufgaben passieren?`
- Vorschlaege: `Pausieren`, `auf andere verteilen`, `nach Rueckkehr sammeln`.
- Fairness bewertet Urlaubswochen anders, damit niemand unfair als `hat Luft` erscheint.

## MVP-Reihenfolge

1. Wiederholungen `alle X Wochen`, monatlich und jaehrlich fuer normale Aufgaben.
2. Manuelle Kalenderereignisse fuer Muell als Aufgabenserie.
3. Urlaub/Ferien als reine Anzeige im Langzeitkalender.
4. Urlaub/Ferien mit automatischer Aufgabenverschiebung.
5. Import aus externen Kalendern oder kommunalen Muellkalendern.
