# Datenschutzerklaerung fuer Homely: Haushalts Manager

Stand: 2026-07-03

Diese Datenschutzerklaerung ist ein Entwurf fuer die App **Homely: Haushalts Manager**. Vor einer Veroeffentlichung im Google Play Store muss sie mit den finalen technischen Funktionen, dem tatsaechlichen Anbieter und einer oeffentlichen URL abgeglichen werden.

## 1. Anbieter

Anbieter der App:

Thomas Hoffmann  
Gress-Straße 1, 71384 Weinstadt, Deutschland  
TODO: E-Mail-Adresse fuer Datenschutzanfragen  
TODO: Support-E-Mail-Adresse  

## 2. Zweck der App

Homely hilft Familien, Wohngemeinschaften und Haushalten dabei, Aufgaben, Essensplanung, Erinnerungen und faire Aufgabenverteilung zu organisieren.

## 3. Welche Daten verarbeitet die App?

Homely verarbeitet je nach Nutzung folgende Daten:

- E-Mail-Adresse fuer Konto und Anmeldung
- Anzeigename oder Mitgliedsname
- Haushaltsname, z. B. Familien- oder WG-Name
- Rollen, z. B. Gruender, Verwalter oder Mitglied
- Aufgaben, Aufwandspunkte und Wiederholungsregeln
- Aufgabenzuordnungen
- Erledigungsstatus und bei Vertretung die Person, die eine Aufgabe erledigt hat
- Essensplaneintraege und Kochzuordnungen
- App-Einstellungen, z. B. Designset oder Darkmode

## 4. Lokale Speicherung

Ein Teil der Daten wird lokal auf dem Geraet gespeichert, damit die App schnell und auch mit bestehendem lokalen Stand nutzbar bleibt.

Lokale App-Daten koennen durch Zuruecksetzen der App-Daten, Deinstallation oder eine in der App vorgesehene lokale Loeschfunktion entfernt werden.

## 5. Konto und Sync

Wenn Nutzer ein Konto erstellen oder den Haushalts-Sync nutzen, werden Konto- und Haushaltsdaten an den technischen Dienstleister Supabase uebertragen.

Supabase wird genutzt fuer:

- E-Mail/Passwort-Anmeldung
- E-Mail-Bestaetigung
- Passwort-Wiederherstellung
- Speicherung und Synchronisierung von Haushaltsdaten
- Zugriffsschutz ueber Rollen und Datenbankregeln

Die Uebertragung erfolgt verschluesselt ueber HTTPS/TLS.

## 6. Keine Werbung und kein Tracking

Die aktuelle Version enthaelt keine Werbung, keine Werbe-SDKs und keine Analytics-SDKs.

Falls spaeter Analyse-, Fehlerbericht- oder Marketingfunktionen hinzukommen, wird diese Datenschutzerklaerung vorher aktualisiert.

## 7. Keine besonderen Berechtigungen

Die aktuelle Version verwendet keine Standort-, Kontakt-, Kalender-, Kamera-, Mikrofon- oder Foto-Berechtigungen.

## 8. Kinder und Familien

Homely kann von Familien genutzt werden und enthaelt Rollen fuer Kinder. Die App ist fuer die Organisation durch Erwachsene, Eltern, Erziehungsberechtigte oder Haushaltsverwalter gedacht.

Eltern oder Erziehungsberechtigte sollten entscheiden, welche Daten von Kindern oder ueber Kinder innerhalb des Haushalts eingetragen werden.

## 9. Weitergabe an Dritte

Homely verkauft keine Nutzerdaten und gibt Daten nicht fuer Werbung oder Tracking weiter.

Zur Bereitstellung von Konto, Authentifizierung und Haushalts-Sync wird Supabase als technischer Dienstleister eingesetzt. Weitere Dienstleister muessen vor Store-Launch ergaenzt werden, falls sie genutzt werden.

## 10. Loeschung von Daten

Nutzer koennen lokale App-Daten durch Zuruecksetzen der App-Daten oder Deinstallation entfernen.

Fuer Sync-Daten ist eine Cloud-Haushaltsloeschung fuer den Gruender vorgesehen. Dabei werden Haushaltsdaten, Mitgliedschaften, Aufgaben, Zuordnungen, Essensplan und Einladungen serverseitig geloescht bzw. deaktiviert.

Fuer das Auth-Konto selbst ist eine In-App-Kontoloeschung per Supabase Edge Function vorgesehen. Dabei werden zugehoerige Homely-Cloud-Daten vorbereitet und anschliessend der Supabase-Auth-User serverseitig geloescht.

Zusaetzlich muss fuer Google Play eine oeffentliche Webressource bereitgestellt werden, ueber die Nutzer die Kontoloeschung auch ohne installierte App beantragen koennen.

TODO: Oeffentliche Kontoloesch-URL und Supportkontakt beschreiben.

## 11. Aenderungen

Diese Datenschutzerklaerung kann angepasst werden, wenn sich Funktionen, technische Dienstleister oder gesetzliche Anforderungen aendern.

## 12. Kontakt

Bei Fragen zum Datenschutz:

TODO: Datenschutz-E-Mail-Adresse
