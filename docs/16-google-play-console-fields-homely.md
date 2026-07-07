# Homely Google-Play-Console-Felder

Stand: 2026-07-07

Arbeitsdokument fuer die spaetere Eintragung in der Google Play Console.

## App-Identitaet

| Feld | Wert |
|---|---|
| App-Name | Homely |
| Store-Titel | Homely: Haushalts Manager |
| Paketname | `com.homely.haushaltsmanager` |
| Kategorie | Produktivitaet |
| Ziel-Domain | `aesti.de` als Uebergangs-Domain, spaeter `homely-haushaltsmanager.de` |

## Kurzbeschreibung

Aufgaben, Essensplan und Fairness fuer Familien und WGs.

## Lange Beschreibung

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

## Store-URLs

| Zweck | URL |
|---|---|
| Datenschutz | `https://aesti.de/datenschutz` |
| Kontoloeschung | `https://aesti.de/konto-loeschen` |
| Impressum | `https://aesti.de/impressum` |

## App Access / Review-Hinweise

Homely kann lokal getestet werden. Fuer Konto- und Sync-Funktionen ist ein Testkonto erforderlich.

Review-Zugangsdaten werden nicht im Repository gespeichert. Sie werden erst beim Upload vertraulich in der Play Console unter den App-Zugriffshinweisen hinterlegt.

Vorschlag fuer Review-Hinweis:

```text
Homely kann lokal genutzt werden. Fuer Konto- und Sync-Funktionen bitte das bereitgestellte Testkonto verwenden.

Pfad zur Kontoloeschung:
Mehr > Konto > Daten & Loeschung > Konto loeschen

Pfad zur Datenschutz-/Kontoloesch-Webressource:
https://aesti.de/datenschutz
https://aesti.de/konto-loeschen
```

## Data Safety Kurzfassung

Aktueller Produktstand:

- E-Mail/Passwort-Konto ueber Supabase Auth
- Haushalts-Sync ueber Supabase
- Keine Werbung
- Kein Tracking
- Keine Analytics
- Keine Standort-, Kontakt-, Kalender-, Kamera-, Mikrofon- oder Foto-Berechtigungen

Voraussichtlich anzugebende Datenkategorien:

- Personal info: E-Mail-Adresse
- Personal info: Anzeigename/Mitgliedsname
- User-generated content: Aufgaben, Essensplan, Haushaltsdaten
- App activity: Erledigungsstatus und Aufgabenzuordnung fuer App-Funktionalitaet

Zwecke:

- App functionality
- Account management

Datenloeschung:

- In-App: `Mehr > Konto > Daten & Loeschung > Konto loeschen`
- Web: `https://aesti.de/konto-loeschen`

## Target Audience / Familienkontext

Arbeitsentscheidung:

- Primaer Erwachsene, Eltern, Erziehungsberechtigte und Haushaltsverwalter
- Familien- und WG-Kontext sichtbar
- Keine Werbung
- Kein Tracking
- Keine offenen Kommunikationsfunktionen
- Keine Standort- oder Kontaktberechtigungen

Vor Einreichung in der Play Console bewusst entscheiden:

- Ob Kinder direkt als Zielgruppe angegeben werden sollen
- Ob Google-Play-Families-Anforderungen beruehrt sind
- Ob Screenshots Kinderrollen zeigen und wie diese formuliert werden

## Content Rating Vorbereitung

Voraussichtliche Antworten:

- Keine Gewalt
- Keine sexuellen Inhalte
- Keine Gluecksspielinhalte
- Keine Nutzerkommunikation/Chat
- Keine Standortfreigabe
- Keine Inhalte, die von fremden Nutzern oeffentlich geteilt werden

Vor Einreichung muss der Content-Rating-Fragebogen direkt in der Play Console final ausgefuellt werden.

## Store-Assets Offen

- Smartphone-Screenshots
- Feature Graphic 1024 x 500 px
- Optional: 7-Zoll/10-Zoll Tablet-Screenshots, falls Tablet-Support beworben wird
- App-Icon ist vorhanden: `apps/mobile/assets/icon.png`
- Adaptive Icon ist vorhanden: `apps/mobile/assets/adaptive-icon.png`
