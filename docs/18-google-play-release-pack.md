# Homely Google Play Release Pack

Stand: 2026-07-04

Dieses Dokument ist die operative Store-Checkliste fuer Homely: Haushalts Manager. Es sammelt die Angaben, Assets und Tests, die vor dem ersten internen Google-Play-Test und vor Production gebraucht werden.

## 1. App-Content in Play Console

Quelle: Google Play Console Help, "Prepare your app for review"

- Datenschutzrichtlinie: URL muss live sein und im Store sowie in der App auffindbar sein.
- Ads: Fuer v1 "Nein", solange keine Ads, Cross-Promotion oder Ad-SDKs eingebaut werden.
- Sign-in details: Reviewer-Zugang angeben, weil Konto/Sync per Login erreichbar ist.
- Target audience: Haushaltsorganisation fuer Erwachsene/Familien/WGs. Kinder koennen Haushaltsmitglieder sein, aber nicht primaere Zielgruppe.
- Permissions declaration: v1 sollte keine SMS, Call Log, Location, Camera, Contacts oder aehnlich sensible Berechtigungen nutzen.
- Content rating: Fragebogen ausfuellen; erwartbar niedrige Altersfreigabe, da keine Gewalt, Dating, Gluecksspiel oder UGC-Feed.
- Data Safety: Muss auch fuer Test-/Production-Tracks vollstaendig und korrekt ausgefuellt werden.

## 2. Data Safety Entwurf

Quelle: Google Play Console Help, "Provide information for Google Play's Data safety section"

Homely v1 sammelt/ verarbeitet nach aktueller Architektur:

- Personenbezogene Daten: E-Mail-Adresse fuer Login und Konto.
- Nutzerinhalte: Haushaltsname, Mitglieder-/Anzeigenamen, Rollen, Aufgaben, Punkte, Essensplan, Erledigungen, Einladungen.
- App-Aktivitaet: Aufgabenstatus und Sync-Aktionen als fachliche Nutzungsdaten.
- Keine Standortdaten.
- Keine Kontakte.
- Keine Kamera/Mikrofon/SMS/Call-Log.
- Keine Werbung.
- Kein Tracking.
- Keine Analytics in v1.
- Keine In-App-Kaeufe in v1.
- Datenuebertragung: Supabase/Backend verarbeitet Daten zur Bereitstellung von Auth, Sync, Einladungen und Kontoloeschung.
- Verschluesselung: HTTPS/TLS fuer Netzwerkuebertragung, Supabase Auth/DB serverseitig.
- Nutzer koennen Datenloeschung anfordern und Konto in der App loeschen.

Vor Einreichung pruefen:

- Stimmen alle eingebundenen SDKs mit dieser Aussage ueberein?
- Gibt es Expo/Supabase SDK-Datenpunkte, die in Data Safety genannt werden muessen?
- Datenschutztext auf GitHub Pages exakt mit App-Verhalten abgleichen.

## 3. Kontoloeschung

Quelle: Google Play Console Help, "Understanding Google Play's app account deletion requirements"

Da Homely Kontoerstellung in der App erlaubt, brauchen wir:

- In-App-Pfad: Mehr > Konto > Daten > Konto loeschen.
- Web-Pfad: `https://aesti.de/konto-loeschen` als Uebergangs-URL, spaeter finale Homely-Domain.
- Web-Ressource muss App/Developer nennen, sichtbar erklaeren, welche Daten geloescht werden, und eine Anfrage ohne Neuinstallation der App ermoeglichen.
- Wenn Daten aus rechtlichen/technischen Gruenden aufbewahrt werden, muss das klar in Datenschutz/Loeschseite stehen.

Aktueller Stand:

- Edge Function `delete-account` ist deployed.
- In-App-Loeschung wurde bereits erfolgreich getestet.
- GitHub-Pages-Seite muss vor Store-Einreichung live sein.

## 4. Store Listing Text

App-Name:

Homely: Haushalts Manager

Kurzbeschreibung, max. 80 Zeichen:

Aufgaben, Fairness und Essensplan fuer Familie oder WG organisieren

Lange Beschreibung, Entwurf:

Homely hilft Familien, Wohngemeinschaften und anderen Haushalten, Aufgaben fair zu verteilen und den Alltag gemeinsam im Blick zu behalten.

Plane wiederkehrende Aufgaben, vergib Punkte, sieh in der Fairness-Uebersicht Soll, Plan und Ist pro Person und halte fest, wer eine Aufgabe wirklich erledigt hat. Wenn jemand einspringt, wird das beruecksichtigt.

Der Essensplan zeigt die Woche und laengere Zeitraeume. Gerichte lassen sich bearbeiten, Personen zuordnen und tauschen.

Mit E-Mail-Konto und Homely-Cloud-Sync koennen ausgewaehlte Haushaltsmitglieder auf denselben Haushalt zugreifen. Gruender und Verwalter organisieren Mitglieder, Aufgaben und Zuordnungen; normale Mitglieder sehen den Haushalt und erledigen Aufgaben.

Version 1 ist bewusst ruhig und werbefrei geplant: keine Werbung, kein Tracking, keine Analytics und keine In-App-Kaeufe.

## 5. Preview Assets

Quelle: Google Play Console Help, "Add preview assets to showcase your app"

Pflicht:

- App Icon: 512 x 512 PNG, 32-bit mit Alpha, max. 1024 KB.
- Feature Graphic: 1024 x 500 JPEG oder 24-bit PNG ohne Alpha.
- Screenshots: mindestens 2, empfohlen mindestens 4 Smartphone-Screenshots mit 1080 x 1920 px oder hoeherem 9:16-Format.

Homely Screenshot-Set fuer v1:

1. Heute: eigene Aufgaben, Sync-Status, Essenshinweis.
2. Woche: meine Aufgaben und kommende Wochen.
3. Fairness: Soll/Plan/Ist je Person.
4. Essensplan: Woche und Langfristig-Bearbeitung.
5. Aufgaben: neue Aufgabe, Punkte, Wiederholung, Erinnerung.
6. Haushalt/Konto: Rollen, Cloud-Sync, Einladungen.

Asset-Regeln:

- Screenshots muessen echte App-UI zeigen.
- Keine veralteten Samsung/Android-Statusleisten mit privaten Benachrichtigungen.
- Keine Claims wie "beste", "#1", "kostenlos", "neu" oder Download-/Ranking-Aussagen.
- Alt-Texte fuer Assets vorbereiten, maximal 140 Zeichen und konkret.

## 6. Interner Test

Vor Production:

- Production/Preview Build auf Samsung installieren.
- Konto erstellen, E-Mail bestaetigen, Passwort vergessen, Passwort aendern.
- Haushalt in Supabase anlegen, Plan hochladen, Plan laden.
- Zweites Konto einladen und beitreten.
- Rollen testen: Gruender, Verwalter, Mitglied.
- Automatischen Mehrkonto-Live-Check aus `docs/12-sync-testplan.md` ausfuehren.
- Mitglied darf Aufgaben erledigen und fremde Aufgaben uebernehmen, aber nicht verwalten.
- Verwalter darf Aufgaben, Essensplan und Zuordnungen verwalten.
- Normales Mitglied darf keine Aufgaben/Personen/Zuordnungen verwalten.
- Konto loeschen und danach Login/Cloud-Zustand pruefen.
- Safe-Areas oben/unten auf Samsung pruefen.
- Darkmode und alle Designsets pruefen.

## 7. Release-Kommandos

Preflight:

```powershell
cd "C:\Users\hoffm\Documents\Family Organizer\apps\mobile"
$env:PATH='C:\Users\hoffm\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;C:\Users\hoffm\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin;' + $env:PATH
& 'C:\Users\hoffm\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd' run check
```

Production AAB:

```powershell
cd "C:\Users\hoffm\Documents\Family Organizer\apps\mobile"
$env:PATH='C:\Users\hoffm\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;C:\Users\hoffm\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin;' + $env:PATH
$env:EAS_NO_VCS='1'
$env:EAS_PROJECT_ROOT='C:\Users\hoffm\Documents\Family Organizer\apps\mobile'
$env:EAS_BUILD_NO_EXPO_GO_WARNING='1'
& 'C:\Users\hoffm\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd' dlx eas-cli@latest build --platform android --profile production --non-interactive --no-wait --message "Homely production AAB"
```

## Quellen

- Google Play Console Help: Prepare your app for review: https://support.google.com/googleplay/android-developer/answer/9859455
- Google Play Console Help: Data safety section: https://support.google.com/googleplay/android-developer/answer/10787469
- Google Play Console Help: Account deletion requirements: https://support.google.com/googleplay/android-developer/answer/13327111
- Google Play Console Help: Preview assets: https://support.google.com/googleplay/android-developer/answer/9866151
- Android Developers: Target API level requirement: https://developer.android.com/google/play/requirements/target-sdk
