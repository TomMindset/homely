# Homely Google-Play-Launch-Checkliste

Stand: 2026-07-03

Ziel: **Homely: Haushalts Manager** als testbare und spaeter oeffentlich anbietbare Android-App in Google Play bringen.

## Status

| Bereich | Status | Naechster Schritt |
|---|---|---|
| Marke/App-Name | In Arbeit | Store-Grafiken und Screenshots finalisieren |
| Android Package | Erledigt | `com.homely.haushaltsmanager` beibehalten |
| EAS Build | In Arbeit | Neuen Preview-Build mit Homely-Slug erzeugen |
| Supabase Sync | In Arbeit | Redirects, Edge Function deployen und Review-Testkonto finalisieren |
| Datenschutz | Entwurf | Oeffentliche Datenschutz-URL bereitstellen |
| Data Safety | Entwurf | In Play Console eintragen und gegen App pruefen |
| Store Listing | Entwurf | Texte, Kategorie und Screenshots final abstimmen |
| Target API | Zu pruefen | AAB nach Build auf API 35+ pruefen |
| Interner Test | Offen | Google-Play-Testtrack einrichten |
| Production Rollout | Offen | Erst nach internem Test und Review |

## Technische Muss-Punkte

- Production-Build als Android App Bundle `.aab`.
- Target API Level 35 oder hoeher.
- Steigende `versionCode` fuer jeden Upload.
- Keine unnoetigen Android-Berechtigungen.
- Login, Sync, Laden, Hochladen, Aufgaben, Mitglieder, Fairness und Essen stabil.
- Supabase RLS fuer alle Haushaltstabellen aktiv.
- Cloud-Haushaltsloeschung fuer Gruender vorhanden.
- In-App-Kontoloeschung per Edge Function vorhanden.
- Webressource fuer Kontoloesch-Anfragen oeffentlich bereitstellen.
- Keine Secret Keys im Client.
- E-Mail-Redirects zeigen nicht auf `localhost`.

## Product-Muss-Punkte

- Onboarding fuer neuen Haushalt neutral: Familie, WG oder Haushalt.
- Gruender/Admin-Logik verstaendlich.
- Mitglieder und Rollen nachvollziehbar.
- Aufgaben koennen verwaltet, zugeordnet und durch andere erledigt werden.
- Fairness zeigt Soll/Ist bzw. Punkte nachvollziehbar.
- Essensplan ist editierbar und Wochen-/Langfristplanung ist verstaendlich.
- Safe Areas fuer Android-Statusleiste und Navigationsleiste sauber.
- Darkmode/Designsets wirken auf die gesamte App.

## Play-Console-Muss-Punkte

- App-Name: Homely
- Store-Titel: Homely: Haushalts Manager
- Kurzbeschreibung eingetragen.
- Lange Beschreibung eingetragen.
- App-Kategorie: Produktivitaet.
- Datenschutz-URL eingetragen.
- Data Safety ausgefuellt.
- Content Rating ausgefuellt.
- Target Audience and Content ausgefuellt.
- App Access/Review-Hinweise eingetragen, falls Login erforderlich ist.
- Screenshots fuer Smartphone hochgeladen.
- Feature Graphic 1024 x 500 px hochgeladen.

## Vor dem ersten internen Testtrack

1. `pnpm run typecheck`
2. `pnpm run check`
3. Optional `pnpm run check:live`
4. Neuer EAS Preview Build
5. Installation auf Samsung
6. Manuelle Hauptflows pruefen
7. Fehlerliste priorisieren
8. Production-AAB bauen
9. Interner Testtrack in Google Play

## Review-Testkonto

Vor dem Upload festlegen:

- Test-E-Mail
- Test-Passwort
- Vorbereiteter Test-Haushalt
- Hinweis fuer Google Review, welche Funktionen Login brauchen

Keine privaten Familien- oder Echtdaten fuer Review-Testkonto verwenden.

## Noch zu entscheiden

- Anbietername/Firma fuer Store und Datenschutz.
- Support-E-Mail.
- Datenschutz-Hosting: eigene Website, Supabase Storage, GitHub Pages oder anderer Host.
- Ob Version 1 schon oeffentlich startet oder zuerst als geschlossener Test.
- Welche oeffentliche URL fuer Kontoloesch-Anfragen in Google Play eingetragen wird.

## Website-Entwurf

Der statische Entwurf fuer die spaetere Domain liegt hier:

`website/homely-haushaltsmanager.de`

Geplante URLs:

- Datenschutz: `https://aesti.de/datenschutz`
- Kontoloeschung: `https://aesti.de/konto-loeschen`
- Impressum: `https://aesti.de/impressum`

## Play-Console-Felder

Das vorbereitete Eintragungspaket liegt hier:

`docs/16-google-play-console-fields-homely.md`
