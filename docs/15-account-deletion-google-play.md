# Homely Kontoloeschung fuer Google Play

Stand: 2026-07-03

Google Play verlangt fuer Apps mit Kontoerstellung:

- einen In-App-Weg, um die Kontoloeschung anzustoßen
- eine Webressource, ueber die Nutzer auch ohne installierte App die Kontoloeschung beantragen koennen
- passende Angaben im Data-Safety-Formular

Quelle: https://support.google.com/googleplay/android-developer/answer/13327111

## Aktueller Homely-Stand

In der App vorbereitet:

- `Mehr > Konto > Daten & Loeschung > Konto loeschen`
- App ruft Supabase Edge Function `delete-account` auf
- Edge Function prueft den eingeloggten Nutzer
- Edge Function ruft `prepare_account_deletion` auf
- Edge Function loescht den Supabase-Auth-User serverseitig mit Admin-Rechten

Im Repo:

- `supabase/migrations/0007_account_deletion_support.sql`
- `supabase/functions/delete-account/index.ts`
- `apps/mobile/src/services/authService.ts`

## Was geloescht wird

Bei der In-App-Kontoloeschung:

- Eigene Supabase-Auth-Identitaet
- Profil-E-Mail/Anzeigename
- Eigene Mitgliedschaften oder, falls Gruender, eigene Haushalte
- Aufgaben, Zuordnungen, Essen und Einladungen in geloeschten Gruender-Haushalten
- Eigene Einladungsbeziehungen

Lokale Daten auf dem Geraet bleiben zunaechst erhalten, bis der Nutzer sie lokal loescht oder die App-Daten entfernt. Das muss in Datenschutzerklaerung und App-Text klar bleiben.

## Deployment-Schritte

1. Migration `0007_account_deletion_support.sql` im Supabase SQL Editor ausfuehren.
2. Edge Function deployen:

```powershell
supabase functions deploy delete-account --project-ref enjogmjdasznqclbhkgs
```

3. Sicherstellen, dass die Function Zugriff auf Secret Keys hat.
4. In der App einloggen.
5. `Mehr > Konto > Daten & Loeschung > Konto loeschen` mit Testaccount pruefen.

Wenn die App meldet, dass die Kontoloeschung nicht bereit ist, kann die Edge Function den Secret Key nicht lesen oder Migration `0007` fehlt.

Function-Secret setzen:

```powershell
& 'C:\Users\hoffm\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd' dlx supabase@latest secrets set HOMELY_SUPABASE_SECRET_KEY=DEIN_SUPABASE_SECRET_KEY --project-ref enjogmjdasznqclbhkgs
```

Danach die Function erneut deployen. Wichtig: `--no-verify-jwt` ist hier beabsichtigt, weil Homely den User-Token innerhalb der Function selbst prueft, bevor geloescht wird.

```powershell
& 'C:\Users\hoffm\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd' dlx supabase@latest functions deploy delete-account --project-ref enjogmjdasznqclbhkgs --no-verify-jwt
```

Den Secret Key findest du im Supabase Dashboard unter den API Keys/Project API Keys. Er beginnt in neuen Projekten typischerweise mit `sb_secret_...`. Diesen Wert niemals in die App oder in `.env` fuer Expo schreiben.

## Webressource fuer Google Play

Uebergangs-URL fuer Kontoloesch-Anfragen: `https://aesti.de/konto-loeschen`.

Minimalanforderung:

- Seite laedt ohne Fehler
- Homely oder Anbietername ist klar erkennbar
- Kontoloeschung ist prominent auffindbar
- Nutzer kann Loeschung beantragen, z. B. per Formular oder Support-E-Mail
- Die Seite verlangt nicht, dass der Nutzer die App erneut installiert

Moegliche erste Version:

- Datenschutzseite mit Abschnitt `Kontoloeschung`
- Support-E-Mail, z. B. `support@...`
- Angaben, welche Daten geloescht werden und welche lokalen Daten auf dem Geraet verbleiben

## Play-Console-Angabe

Im Data-Safety-Bereich angeben:

- Account deletion available: Ja
- In-app path: `Mehr > Konto > Daten & Loeschung > Konto loeschen`
- Web deletion URL: `https://aesti.de/konto-loeschen`

## Offene Punkte

- Support-/Datenschutz-E-Mail final festlegen.
- Datenschutzseite oeffentlich unter `https://aesti.de/datenschutz` hosten.
- Edge Function in Supabase deployen und mit Testaccount pruefen.
- Optional: lokale Daten nach erfolgreicher Kontoloeschung automatisch zuruecksetzen oder Nutzer danach explizit fragen.
