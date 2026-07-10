# Homely Play Console Submission Packet

Stand: 2026-07-10

Dieses Dokument ist die kompakte Eingabemappe fuer die Google Play Console.

## App-Grunddaten

| Feld | Wert |
|---|---|
| App-Name | Homely |
| Store-Titel | Homely: Haushalts Manager |
| Standard-Sprache | Deutsch |
| App oder Spiel | App |
| Kostenlos oder kostenpflichtig | Kostenlos |
| Kategorie | Produktivitaet |
| Android Package | `com.homely.haushaltsmanager` |

## Release / Interner Test

| Feld | Wert |
|---|---|
| Track | Interner Test |
| AAB | `artifacts/homely-1.0.0-versionCode4.aab` |
| Release-Name | Homely 1.0.0 internal test 1 |
| Version | `1.0.0` |
| versionCode | `4` |
| SHA-256 | `7F742D74F2ADD21E50AC401C6008592F31505230FC9291FF902FB399CC07F89B` |

Release Notes:

```text
<de-DE>
Erste interne Testversion von Homely.

Enthaelt Tagesaufgaben, Wochenuebersicht, Fairness-Auswertung, Essensplan, Personen- und Rollenverwaltung, E-Mail-Konto, Supabase-Sync, Einladungen, Darkmode, Designsets sowie Konto- und Cloud-Datenloeschung.
</de-DE>
```

## Store Listing

Kurzbeschreibung:

```text
Aufgaben, Essensplan und Fairness fuer Familien und WGs.
```

Lange Beschreibung:

```text
Homely hilft Familien, Wohngemeinschaften und Haushalten, wiederkehrende Aufgaben, Essensplanung und faire Verteilung an einem Ort zu organisieren.

Plane Aufgaben fuer die Woche, verteile sie auf Personen, markiere Erledigtes und behalte im Blick, ob die Belastung fair verteilt ist. Homely verbindet Haushaltsplanung mit einem klaren Wochenrhythmus, damit alle sehen, was ansteht und wer woran beteiligt ist.

Funktionen:

- Tagesansicht mit den eigenen Aufgaben
- Wochenplan mit Aufgaben fuer den Haushalt
- Aufgaben mit Punkten, Wiederholungen und Erinnerungen
- Faire Aufgabenverteilung nach Aufwand
- Vertretung: Aufgaben koennen auch von anderen Mitgliedern erledigt werden
- Personen und Rollen fuer Gruender, Verwalter und Mitglieder
- Essensplan pro Woche
- Konto per E-Mail und optionaler Haushalts-Sync
- Designsets inklusive Darkmode

Homely ist fuer Haushalte gedacht, die ihren Alltag gemeinsam organisieren moechten, ohne dass eine Person alles im Kopf behalten muss.

Die aktuelle Version nutzt E-Mail-Konten und Haushalts-Sync, wenn diese Funktionen aktiviert werden. Es sind keine Werbung, kein Tracking und keine Analytics aktiv.
```

## URLs

| Zweck | URL |
|---|---|
| Website | https://aesti.de/ |
| Datenschutz | https://aesti.de/datenschutz |
| Kontoloeschung | https://aesti.de/konto-loeschen |
| Impressum | https://aesti.de/impressum |

## Store Assets

| Asset | Datei |
|---|---|
| App-Icon 512 x 512 | `store-assets/homely-app-icon-512.png` |
| Feature Graphic 1024 x 500 | `store-assets/homely-feature-graphic-1024x500.png` |
| Smartphone-Screenshots | Noch aus echter App/Testinstallation erstellen |

## App-Zugriff / Review-Hinweise

Review-Zugangsdaten gehoeren nicht ins Repository. Sie werden nur vertraulich in der Play Console eingetragen.

Hinweistext:

```text
Homely kann lokal genutzt werden. Fuer Konto- und Sync-Funktionen bitte das bereitgestellte Testkonto verwenden.

Pfad zur Kontoloeschung:
Mehr > Konto > Daten & Loeschung > Konto loeschen

Pfad zur Datenschutz-/Kontoloesch-Webressource:
https://aesti.de/datenschutz
https://aesti.de/konto-loeschen
```

## Data Safety

Sammelt die App Nutzerdaten?

```text
Ja
```

Teilt die App Nutzerdaten mit Dritten?

```text
Nein, sofern Supabase als technischer Dienstleister fuer Auth, Datenbank und Sync eingesetzt wird und keine Daten fuer Werbung, Tracking oder fremde Zwecke weitergegeben werden.
```

Daten werden verschluesselt uebertragen?

```text
Ja, ueber HTTPS/TLS.
```

Koennen Nutzer Daten loeschen?

```text
Ja. In-App ueber Mehr > Konto > Daten & Loeschung > Konto loeschen. Zusaetzlich per Webressource unter https://aesti.de/konto-loeschen.
```

Datenkategorien:

- Personal info: E-Mail-Adresse
- Personal info: Name / Anzeigename / Mitgliedsname
- User-generated content: Aufgaben, Essensplan, Haushaltsdaten
- App activity: Erledigungsstatus und Aufgabenzuordnung fuer App-Funktionalitaet

Zwecke:

- App functionality
- Account management

Nicht angeben, solange nicht eingebaut:

- Advertising or marketing
- Analytics
- Fraud prevention/security als separater Datenzweck
- Location
- Contacts
- Photos/videos/audio
- Financial info
- Health and fitness

## Content Rating

Voraussichtliche Antworten:

- Keine Gewalt
- Keine sexuellen Inhalte
- Kein Gluecksspiel
- Kein Chat / keine offene Nutzerkommunikation
- Keine Standortfreigabe
- Keine oeffentlich geteilten Nutzerinhalte
- Keine In-App-Kaeufe
- Keine Werbung

## Target Audience

Empfehlung fuer v1:

- Primaer Erwachsene, Eltern, Erziehungsberechtigte und Haushaltsverwalter.
- Familien- und WG-Kontext sichtbar.
- Kinder koennen als Haushaltsmitglieder vorkommen, die App wird aber nicht primaer als Kinder-App vermarktet.
- Keine Werbung, kein Tracking, keine offenen Kommunikationsfunktionen.

## Was ich nicht allein final bestaetigen kann

- Rechtliche Endfreigabe von Impressum/Datenschutz.
- Vertrauliche Review-Testzugangsdaten.
- Play-Console-Erklaerungen, die Google als verbindliche Developer-Erklaerung behandelt.
- Finales Absenden zur Pruefung, sofern Du die Console nicht offen hast und die Einreichung bewusst bestaetigst.
