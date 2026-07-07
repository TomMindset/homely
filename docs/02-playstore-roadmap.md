# Play-Store-Roadmap

Stand: 2026-07-03

## Ziel

Aus dem aktuellen Expo-Prototypen eine testbare und spaeter im Google Play Store veroeffentlichbare App namens **Homely: Haushalts Manager** machen.

## Naechste Meilensteine

### 1. Installierbarer Test auf Android

- Expo-App lokal starten
- mit Expo Go oder Preview-Build auf Android testen
- Hauptflows pruefen:
  - aktuelle Tagesaufgaben sehen
  - Aufgabe abhaken
  - Woche wechseln
  - neue Aufgabe hinzufuegen
  - Fairness pruefen
  - Essensplan ansehen
  - Konto anlegen/einloggen
  - Haushalt synchronisieren

### 2. MVP-Datenmodell festigen

- Aufgabenregeln editierbar halten
- Haushaltsmitglieder editierbar halten
- eigene Aufgaben mit Wiederholung speichern
- Essensplan editierbar halten
- Rollen- und Berechtigungskonzept weiter haerten
- Konto-/Haushaltsloeschung ergaenzen

### 3. Lokaler Speicher plus Sync

Homely bleibt im Nutzungserlebnis lokal schnell und robust, bekommt aber fuer gemeinsame Haushalte Supabase-Sync.

Naechste technische Optionen:

- AsyncStorage kurzfristig beibehalten
- spaeter robustere lokale Datenbank pruefen:
  - SQLite
  - WatermelonDB
  - Realm

### 4. Familien- und Haushalts-Sync

Fuer eine echte Familien- oder WG-App ist Sync der Kern.

Aktuelle Entscheidung:

- Supabase ist als Ziel-Backend festgelegt.
- Version 1 soll E-Mail-Konto und optionalen Haushalts-Sync koennen.
- Lokale Nutzung bleibt als Basis moeglich, aber Store-Datenschutz und Data Safety werden auf Sync ausgelegt.
- Konzept liegt in `docs/09-account-familienzugriff-sync.md`.

### 5. Store-Vorbereitung

- App-Name finalisieren: `Homely: Haushalts Manager`
- Package Name finalisieren: `com.homely.haushaltsmanager`
- Expo Slug finalisieren: `homely-haushaltsmanager`
- App-Icon und Splash Screen erstellen: erledigt als erstes Homely-Branding-Set
- Screenshots fuer Play Store erzeugen: Storyboard vorhanden, echte Screenshots offen
- Kurzbeschreibung und Langbeschreibung schreiben: Arbeitsfassung vorhanden
- Datenschutzerklaerung erstellen: Entwurf vorhanden, finale URL offen
- Data-Safety-Formular vorbereiten: Entwurf fuer Sync-Version vorhanden
- Content Rating ausfuellen
- Zielgruppe und Familien-/Kinderfragen klaeren
- Review-Testkonto vorbereiten

### 6. Build-Pipeline

- EAS CLI einrichten
- `eas.json` anlegen: erledigt
- Preview-Build fuer Android erzeugen
- Testverteilung klaeren
- Production App Bundle `.aab` erzeugen
- AAB auf Target API 35+ pruefen

## Wichtige Produktentscheidung

Die App beruehrt Haushalts-, Familien- und moeglicherweise Kinderdaten. Deshalb sollte das Produktprinzip sein:

- so wenig personenbezogene Daten wie moeglich
- keine Werbung in Version 1
- keine Tracking-SDKs
- klare Datenschutzerklaerung
- Sync nur mit sauberem Account- und Berechtigungskonzept
- Loeschkonzept vor Production-Launch

Aktueller Datenschutzstand:

- lokale Nutzung plus Supabase-Sync
- E-Mail/Passwort-Konto ueber Supabase Auth
- keine Werbung
- kein Tracking
- keine Analytics
- Datenschutz-Hinweis in der App vorhanden
- Datenschutzerklaerungs-Entwurf in `docs/privacy-policy-de-draft.md`
- Data-Safety-Entwurf in `docs/06-play-store-data-safety-homely.md`
- Store-Listing-Entwurf in `docs/07-play-store-listing-homely.md`
- Screenshot-Storyboard in `docs/08-play-store-screenshots-homely.md`
- Account-/Sync-Konzept in `docs/09-account-familienzugriff-sync.md`
- EAS-Build-Plan in `docs/10-eas-build-release-homely.md`
- Launch-Checkliste in `docs/14-google-play-launch-checklist.md`

## Empfehlung fuer den naechsten Sprint

1. Supabase-Redirects fuer E-Mail-Bestaetigung und Passwort-Reset finalisieren.
2. Konto- und Haushaltsloeschung umsetzen.
3. Neuen Preview-Build mit Homely-Slug erzeugen.
4. Store-Screenshots und Feature Graphic erstellen.
5. Production-AAB fuer internen Google-Play-Testtrack bauen.
