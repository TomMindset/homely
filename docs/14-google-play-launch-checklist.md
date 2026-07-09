# Homely Google-Play-Launch-Checkliste

Stand: 2026-07-10

Ziel: **Homely: Haushalts Manager** als testbare und spaeter oeffentlich anbietbare Android-App in Google Play bringen.

## Status

| Bereich | Status | Naechster Schritt |
|---|---|---|
| Marke/App-Name | Erledigt | Store-Grafiken und Screenshots finalisieren |
| Android Package | Erledigt | `com.homely.haushaltsmanager` beibehalten |
| EAS Build | Erledigt | Production-AAB `1.0.0` / `versionCode 4` in Play Console hochladen |
| Supabase Sync | In Arbeit | Review-Testkonto finalisieren |
| Datenschutz | Erledigt | URLs in Play Console eintragen |
| Data Safety | Entwurf | In Play Console eintragen und gegen App pruefen |
| Store Listing | Entwurf | Texte, Kategorie und Screenshots final abstimmen |
| Target API | Zu pruefen | AAB im Play-Upload validieren |
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
- Webressource fuer Kontoloesch-Anfragen oeffentlich bereitgestellt.
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
4. Installation auf Samsung
5. Manuelle Hauptflows pruefen
6. Fehlerliste priorisieren
7. Production-AAB in Play Console hochladen
8. Interner Testtrack in Google Play

## Review-Testkonto

Vor dem Upload in der Play Console vertraulich festlegen:

- Test-E-Mail
- Test-Passwort
- Vorbereiteter Test-Haushalt
- Hinweis fuer Google Review, welche Funktionen Login brauchen

Keine privaten Familien- oder Echtdaten fuer Review-Testkonto verwenden.

## Noch zu entscheiden

- Ob Version 1 schon oeffentlich startet oder zuerst als geschlossener Test.
- Review-Testkonto und Test-Haushalt ohne Echtdaten.

## Website-Entwurf

Der statische Entwurf fuer die spaetere Domain liegt hier:

`website/homely-haushaltsmanager.de`

Live-URLs:

- Datenschutz: `https://aesti.de/datenschutz`
- Kontoloeschung: `https://aesti.de/konto-loeschen`
- Impressum: `https://aesti.de/impressum`

## Play-Console-Felder

Das vorbereitete Eintragungspaket liegt hier:

`docs/16-google-play-console-fields-homely.md`
