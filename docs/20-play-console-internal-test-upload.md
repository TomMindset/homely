# Homely Play Console Upload Runbook

Stand: 2026-07-10

Dieses Runbook beschreibt den naechsten manuellen Schritt in der Google Play Console: **Homely 1.0.0 als internen Test hochladen**.

## Artefakt

- Datei: `artifacts/homely-1.0.0-versionCode4.aab`
- EAS Build ID: `5923f656-90e0-4c11-8e71-670074981e13`
- EAS AAB: https://expo.dev/artifacts/eas/CiEYZeiE3LVycOqnL_lRBzDxrLkBSiundJAQeVXfBTE.aab
- App-Version: `1.0.0`
- Android `versionCode`: `4`
- SHA-256: `7F742D74F2ADD21E50AC401C6008592F31505230FC9291FF902FB399CC07F89B`

## Vor dem Upload

1. In Google Play Console die App `Homely` oeffnen oder neu anlegen.
2. App-Name: `Homely`
3. Standard-Sprache: Deutsch.
4. App oder Spiel: App.
5. Kostenlos oder kostenpflichtig: Kostenlos, sofern v1 ohne Bezahlung startet.
6. Datenschutz-URL eintragen: `https://aesti.de/datenschutz`
7. Kontoloesch-URL eintragen: `https://aesti.de/konto-loeschen`
8. App-Zugriffshinweise vorbereiten: Review-Testkonto nicht im Repo speichern, nur in der Play Console eintragen.

## Interner Testtrack

1. Play Console oeffnen.
2. Links: **Testen > Interner Test**.
3. Falls noch keine Testergruppe existiert: interne Tester mit Google-Konten anlegen.
4. **Neue Version erstellen**.
5. AAB hochladen: `artifacts/homely-1.0.0-versionCode4.aab`
6. Release-Name: `Homely 1.0.0 internal test 1`
7. Release Notes eintragen.
8. Speichern, Pruefungen abwarten, dann internen Test starten.

## Release Notes

```text
<de-DE>
Erste interne Testversion von Homely.

Enthaelt Tagesaufgaben, Wochenuebersicht, Fairness-Auswertung, Essensplan, Personen- und Rollenverwaltung, E-Mail-Konto, Supabase-Sync, Einladungen, Darkmode, Designsets sowie Konto- und Cloud-Datenloeschung.
</de-DE>
```

## Store-URLs

- Startseite: https://aesti.de/
- Datenschutz: https://aesti.de/datenschutz
- Kontoloeschung: https://aesti.de/konto-loeschen
- Impressum: https://aesti.de/impressum

Alle vier URLs wurden am 2026-07-10 mit HTTP 200 geprueft.

## Nach dem Upload

1. Play-Console-Fehler und Warnungen lesen.
2. Falls Target API, Signatur, Data Safety oder App Content blockieren: zuerst diese Punkte schliessen.
3. Internen Testlink oeffnen und auf Samsung installieren.
4. Testablauf aus `docs/12-sync-testplan.md` und `docs/18-google-play-release-pack.md` ausfuehren.
5. Erst nach erfolgreichem internem Test Closed/Open/Production vorbereiten.

## Erwartbare Play-Console-Pflichtbereiche

- App-Inhalt / Datenschutzrichtlinie
- Data Safety
- App-Zugriff, falls Login fuer Review erforderlich ist
- Content Rating
- Zielgruppe und Inhalte
- Store-Listing mit Screenshots und Feature-Grafik
- Preise und Verfuegbarkeit
- App Bundle Upload in einem Testtrack

## Hinweise

- Der EAS-interne Slug lautet historisch `right-to-lead`; das ist fuer Google Play nicht sichtbar.
- Google Play bewertet das Android Package `com.homely.haushaltsmanager`, App-Name, Version, Signatur und AAB.
- Bei persoenlichen Google-Play-Entwicklerkonten koennen zusaetzliche Testanforderungen gelten, bevor Production moeglich ist.
