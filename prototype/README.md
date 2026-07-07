# Familienplaner Prototyp

Dies ist der erste klickbare MVP-Prototyp fuer die Familienplaner-App.

## Start

Oeffne `index.html` direkt im Browser.

Der Prototyp benoetigt aktuell keinen Build-Schritt, keine Installation und keinen lokalen Server.

## Enthaltene Bereiche

- Heute: Tagesaufgaben, Abhaken, heutiges Essen
- Woche: Wochenraster fuer das komplette aktuelle Jahr
- Fairness: Einheiten pro Person und Vergleich zum Wochenziel
- Essen: Essensplan aus der Excel-Logik
- Aufgaben: Aufgabenstamm mit Kategorien, Aufwandseinheiten und eigenen neuen Aufgaben
- Kalender: automatische Auswahl der aktuellen Kalenderwoche und des heutigen Wochentags

## Datenquelle

Die Datei `data/seed-data.js` wird aus der Excel-Datei generiert. Das Importskript liegt unter:

`../tools/extract_family_planner.py`

Aktuell extrahiert der Import:

- 5 Familienmitglieder
- 20 Aufgaben
- 20 Wiederholungsregeln
- alle Kalenderwochen des aktuellen Jahres
- 2506 regelbasierte Aufgaben-Zuweisungen fuer 2026
- 371 Essensplan-Eintraege fuer 2026

Hinweis: Die Excel enthaelt Aufgabenmuster fuer KW30 bis KW52. Der Prototyp erzeugt daraus inzwischen ein regelbasiertes Jahresmodell: taeglich, saisonal taeglich, woechentlich an bestimmten Tagen und Intervalle wie 28/56/175 Tage. Die konkrete Personenzuordnung nutzt weiterhin die Excel-Wochen als Muster.

## Eigene Aufgaben

Neue Aufgaben werden im Browser lokal gespeichert (`localStorage`). Das reicht fuer den Prototyp. Fuer die echte App brauchen wir spaeter eine Datenbank bzw. einen Sync-Speicher.

## Aktueller Zweck

Der Prototyp dient dazu, Produktlogik und Bediengefuehl schnell zu pruefen, bevor wir daraus eine echte mobile App mit Expo/React Native machen.
