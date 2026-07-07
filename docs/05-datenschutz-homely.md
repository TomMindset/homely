# Homely Datenschutz- und Sicherheitskonzept

Stand: 2026-07-03

Dieses Dokument beschreibt den aktuellen Datenschutzstand fuer **Homely: Haushalts Manager** und dient als Arbeitsgrundlage fuer Google Play, Datenschutzerklaerung und technische Entscheidungen.

Wichtiger Hinweis: Dies ist ein technischer und produktbezogener Entwurf, keine Rechtsberatung. Vor einer Veroeffentlichung sollte die finale Datenschutzerklaerung rechtlich geprueft und mit dem tatsaechlichen Anbieter abgeglichen werden.

## Aktueller App-Stand

Homely ist eine Haushalts-App mit lokaler Nutzung und vorbereitetem Supabase-Sync.

Die App verarbeitet:

- Haushaltsname
- Personen/Mitglieder mit Anzeigename, Kuerzel, Rolle und Farbe
- Aufgaben, Punkte und Wiederholungsregeln
- Aufgabenzuordnungen zu Personen
- Erledigungsstatus, inklusive "erledigt durch" bei Vertretung
- Essensplan und Kochzuordnung
- App-Einstellungen, z. B. Designset/Darkmode
- Konto-E-Mail und Supabase-Authentifizierung fuer Sync

Lokale Daten liegen auf dem Geraet. Wenn ein Nutzer ein Konto erstellt und den Haushalts-Sync nutzt, werden Konto- und Haushaltsdaten an Supabase uebertragen.

## Datenschutzprinzipien

1. So wenig Daten wie moeglich.
2. Keine Werbung in Version 1.
3. Kein Tracking und keine Analytics in Version 1.
4. Kein Verkauf von Daten.
5. Sync nur mit Konto, Rollenmodell und Row Level Security.
6. Mitglieder ohne Verwaltungsrecht duerfen Verwaltungsfunktionen nicht ausfuehren.
7. Datenschutz, Data Safety und App-Verhalten muessen deckungsgleich bleiben.
8. Cloud-Haushaltsloeschung und In-App-Kontoloeschung anbieten; zusaetzliche Webressource fuer Google Play bereitstellen.

## Datenfluesse

| Bereich | Lokal gespeichert | Supabase-Sync | Zweck |
|---|---:|---:|---|
| Konto-E-Mail | Ja | Ja | Anmeldung und Identifikation |
| Passwort | Nein | Ja | Supabase Auth verarbeitet Passwoerter |
| Haushaltsname | Ja | Ja | Anzeige und Organisation |
| Personen/Mitglieder | Ja | Ja | Aufgabenverteilung und Rollen |
| Aufgaben | Ja | Ja | Haushaltsplanung |
| Zuordnungen/Status | Ja | Ja | Tagesplan, Fairness und Vertretung |
| Essensplan | Ja | Ja | Wochenplanung |
| Design/Einstellungen | Ja | Nein | App-Erlebnis |

## Supabase

Homely nutzt Supabase fuer:

- E-Mail/Passwort-Login
- E-Mail-Bestaetigung und Passwort-Wiederherstellung
- Haushaltsdatenbank fuer Sync
- Rollen- und Zugriffsschutz per Row Level Security

Projekt-URL im aktuellen Entwicklungsstand:

`https://enjogmjdasznqclbhkgs.supabase.co`

Vor dem Store-Launch muessen in Supabase final geprueft werden:

- Site URL und Redirect URLs fuer E-Mail-Bestaetigung/Passwort-Reset
- SMTP-Absender oder Supabase-Standardmailing
- RLS-Policies fuer alle Tabellen
- In-App-Kontoloeschung per Supabase Edge Function
- Oeffentliche Webressource fuer Kontoloesch-Anfragen
- Cloud-Haushaltsloeschung per Owner-RPC
- Backup- und Supportprozess

## Google-Play-Einschaetzung fuer Version 1

Da Homely mit Konto und Sync Daten vom Geraet an Supabase uebertraegt, muss Google Play Data Safety **Daten werden erhoben** angeben.

Voraussichtliche Kategorien:

- Personal info: E-Mail-Adresse, Name/Anzeigename
- User-generated content: Aufgaben, Essensplan, Haushaltsinformationen
- App activity oder App info/performance nur dann, wenn spaeter Analytics, Crash Reporting oder Diagnose-SDKs eingebaut werden

Aktuell nicht genutzt:

- Standort
- Kontakte
- Kalender
- Kamera/Mikrofon/Fotos
- Werbung
- Analytics

## Sicherheitsmassnahmen

- HTTPS/TLS durch Supabase.
- Supabase Publishable Key im Client, keine Secret Keys in der App.
- Row Level Security fuer Haushaltsdaten.
- Rollenmodell: Gruender/Verwalter verwalten, Mitglieder bearbeiten nur eigene Erledigungen.
- Keine sensiblen Android-Berechtigungen.
- Keine Werbe- oder Tracking-SDKs.

## Risiken vor Store-Launch

- Datenschutz-URL muss oeffentlich erreichbar sein.
- Cloud-Haushaltsloeschung und In-App-Kontoloeschung sind technisch vorbereitet; die Google-Play-Webressource muss noch bereitgestellt werden.
- Data Safety muss nach jedem SDK oder Backend-Feature erneut geprueft werden.
- Zielgruppe/Kinderkontext muss in Google Play sauber eingeordnet werden.
- E-Mail-Redirects duerfen nicht mehr auf `localhost` zeigen.
- Support-Kontakt und Impressums-/Anbieterangaben fehlen noch.

## Quellen

- Google Play Data Safety: https://support.google.com/googleplay/android-developer/answer/10787469
- Google Play User Data Policy: https://support.google.com/googleplay/android-developer/answer/10144311
- Google Play Target API Level: https://support.google.com/googleplay/android-developer/answer/11926878
