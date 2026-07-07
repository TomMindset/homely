# Homely Play-Store Data Safety Entwurf

Stand: 2026-07-03

Dieser Entwurf hilft beim Ausfuellen des Google-Play-Data-Safety-Formulars fuer **Homely: Haushalts Manager**.

Wichtiger Hinweis: Die Angaben gelten fuer den aktuellen Stand mit Supabase Auth und Haushalts-Sync, aber ohne Werbung, ohne Analytics und ohne Crash-Reporting-SDK. Jede technische Erweiterung muss hier erneut geprueft werden.

## Kurzfazit fuer Version 1

Aktueller Vorschlag:

- Data collection: Ja
- Data sharing: Nein, sofern Supabase als Auftragsverarbeiter/Dienstleister fuer App-Funktionalitaet genutzt und keine Daten fuer eigene Drittzwecke weitergegeben werden
- Daten werden verschluesselt uebertragen: Ja, ueber HTTPS/TLS
- Datenloeschung: Cloud-Haushalt kann durch den Gruender geloescht werden; In-App-Kontoloeschung ist per Edge Function vorbereitet; Webressource fuer Google Play fehlt noch
- Keine Werbung
- Keine Analytics
- Keine Standort-, Kontakt-, Kamera-, Mikrofon- oder Kalenderberechtigungen

## Data Safety Formular

### Sammelt die App Nutzerdaten?

Vorschlag: **Ja**

Begruendung: Konto- und Haushaltsdaten werden bei aktivem Sync an Supabase uebertragen.

### Teilt die App Nutzerdaten mit Dritten?

Vorschlag: **Nein**, wenn Supabase nur als technischer Dienstleister fuer Auth, Datenbank und Hosting genutzt wird und keine Daten fuer Werbung, Tracking oder fremde Zwecke weitergegeben werden.

Hinweis: Diese Einordnung muss vor Veroeffentlichung mit der finalen Datenschutz- und Auftragsverarbeitungslogik abgeglichen werden.

### Werden Daten verschluesselt uebertragen?

Vorschlag: **Ja**

Begruendung: Supabase-Endpunkte laufen ueber HTTPS/TLS.

### Koennen Nutzer Daten loeschen?

Vorschlag fuer Store-Launch:

- Lokal: Ja, ueber lokale Ruecksetzung/App-Datenloeschung.
- Konto: In-App-Loeschung per Edge Function vorbereitet; zusaetzlicher Weblink fuer Google Play erforderlich.
- Haushalt: Gruender koennen den aktiven Cloud-Haushalt in der App loeschen.

Aktueller Status: **Haushaltsloeschung und In-App-Kontoloeschung technisch vorbereitet, Webressource noch offen.**

## Datenkategorien nach Google Play

| Kategorie | Homely-Daten | Zweck | Erforderlich? |
|---|---|---|---:|
| Personal info: Email address | Konto-E-Mail | Account management, app functionality | Ja |
| Personal info: Name | Anzeigename/Mitgliedsname | Haushaltsanzeige, Aufgabenverteilung | Ja |
| User-generated content | Aufgaben, Essen, Haushaltsnotizen/Eintraege | App functionality | Ja |
| App activity | Erledigungsstatus, Zuordnungen | App functionality, Fairness | Ja |
| Device or other IDs | Nicht bewusst genutzt | - | Nein |
| Location | Nicht genutzt | - | Nein |
| Contacts | Nicht genutzt | - | Nein |
| Calendar | Nicht genutzt | - | Nein |
| Photos/videos/audio | Nicht genutzt | - | Nein |
| Financial info | Nicht genutzt | - | Nein |
| Health and fitness | Nicht genutzt | - | Nein |

## Zwecke

Bei den erhobenen Daten voraussichtlich angeben:

- App functionality
- Account management

Nicht angeben, solange nicht eingebaut:

- Advertising or marketing
- Analytics
- Fraud prevention/security als eigener Datenzweck, sofern keine separaten Sicherheits-/Device-Daten erfasst werden

## Familien- und Kinderkontext

Homely kann Familienrollen enthalten. Fuer Version 1 sollte die Store-Positionierung primaer Erwachsene, Eltern, Erziehungsberechtigte und Haushaltsverwalter adressieren.

Konservative Empfehlung:

- Keine Werbung.
- Keine Tracking-SDKs.
- Keine offenen Chats oder fremden Kontakte.
- Keine Standort- oder Kontaktberechtigungen.
- Keine App als direkte Kinder-App vermarkten, solange Google-Play-Families-Anforderungen nicht gesondert final geprueft sind.

## Aenderungen, die eine neue Pruefung ausloesen

- Analytics oder Crash Reporting
- Push Notifications
- Einladung per SMS
- In-App-Kaeufe oder Abo
- Kalenderintegration
- Kontaktzugriff
- Datei-/Bild-Uploads
- Standortfunktionen
- Werbung

## Quellen

- Google Play Data Safety: https://support.google.com/googleplay/android-developer/answer/10787469
- Google Play User Data Policy: https://support.google.com/googleplay/android-developer/answer/10144311
