# Homely Customer Journey & Live Readiness

Stand: 2026-07-07

Ziel: Homely soll beim taeglichen Oeffnen sofort nuetzlich sein und vor dem Google-Play-Start keine versteckten Pflichtluecken mehr haben.

## 1. Regelmaessiger Nutzer

Primäre Journey:

1. App oeffnen.
2. `Heute` sehen.
3. Eigene Tagesaufgaben sehen.
4. Aufgabe abhaken.
5. Bei Bedarf Aufgabe eines anderen Mitglieds uebernehmen.
6. Essen fuer heute sehen.

UX-Regel:

- Startansicht bleibt `Heute`.
- Sichtbarer Personenfilter startet auf der aktiven Person, nicht auf `Alle`.
- `Alle` bleibt als bewusster Wechsel fuer Vergleich/Vertretung verfuegbar.
- Verwaltung liegt in `Mehr`, `Aufgaben`, `Fairness` und `Essen`, nicht im ersten Tagesfluss.

## 2. Neuer Nutzer

Primäre Journey:

1. Haushalt oder WG benennen.
2. Eigene Person und weitere Haushaltsmitglieder erfassen.
3. Standard-Aufgaben als Vorlage erhalten.
4. Direkt auf `Heute` landen.
5. Spaeter optional Konto/Cloud aktivieren.

Offen fuer v1-Politur:

- Kurzer Assistent nach Onboarding: `Vorlagen pruefen`, `Personen anpassen`, `Cloud spaeter einrichten`.
- Leere Zustaende noch freundlicher machen, falls heute keine Aufgabe fuer die aktive Person geplant ist.
- Einladungsflow mit kurzer Erklaerung fuer Gruender/Verwalter.

## 3. Haushaltsverwaltung

Aktuelle UX-Regel:

- Personenkarte zeigt Name/Rolle oben.
- Bearbeiten/Loeschen stehen darunter rechts, damit lange Namen nicht umbrechen.
- Normale Mitglieder sehen Personeninformationen, aber keine Verwaltungsaktionen.

## 4. Website fuer Google Play

Uebergangs-URLs:

- Datenschutz: `https://aesti.de/datenschutz`
- Impressum: `https://aesti.de/impressum`
- Kontoloeschung: `https://aesti.de/konto-loeschen`

Finale Domain spaeter:

- `homely-haushaltsmanager.de`

## 5. Screenshots

Ich kann Screenshots selbst ziehen, sobald eine reproduzierbare App-Ansicht erreichbar ist:

- Lokal per Expo/Web fuer schnelle Layout-Kontrolle.
- Per Android Preview/geraeteseitigem Screenshot fuer echte Play-Store-Assets.

Store-Screenshot-Set:

1. Heute: eigene Aufgaben.
2. Woche: meine Woche und alle Aufgaben.
3. Fairness: Soll/Plan/Ist.
4. Essen: Wochen- und Langfristansicht.
5. Aufgaben: Vorlage, neue Aufgabe, Punkte.
6. Mehr: Konto/Cloud/Haushalt.

## 6. Live-Go Blocker

Vor internem Google-Play-Test noch noetig:

- GitHub Pages fuer `aesti.de` live schalten.
- Datenschutz/Impressum mit echten Anbieterangaben finalisieren.
- Play Console Data Safety final ausfuellen.
- Content Rating ausfuellen.
- App-Zugriff fuer Reviewer dokumentieren.
- Aktuelle Screenshots und Feature Graphic erzeugen.
- EAS Production AAB bauen und hochladen.
- Interner Play-Test auf Samsung bestehen.
