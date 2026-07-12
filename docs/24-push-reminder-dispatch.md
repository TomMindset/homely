# Homely Push Reminder Dispatch

Stand: 2026-07-12

Ziel: Homely erinnert serverseitig an faellige Aufgaben. Die App registriert Push-Tokens, Supabase claimt faellige Aufgaben, eine Edge Function sendet ueber Expo Push und `notification_log` verhindert doppelte Erinnerungen.

## Bestandteile

- Migrationen:
  - `supabase/migrations/0010_task_reminder_dispatch.sql`
  - `supabase/migrations/0011_notification_preference_controls.sql`
  - `supabase/migrations/0012_notification_dispatch_expansion.sql`
- Edge Function: `supabase/functions/send-task-reminders/index.ts`
- Tabellen:
  - `push_tokens`
  - `notification_preferences`
  - `notification_log`
- RPC:
  - `claim_due_task_reminders(target_window_start, target_window_end, target_max_items)`
  - `claim_overdue_task_summaries(target_window_start, target_window_end, target_max_items)`
  - `claim_household_status_summaries(target_window_start, target_window_end, target_max_items)`
- App-Steuerung:
  - Testbenachrichtigung
  - Aufgaben-Erinnerungen
  - Aenderungshinweise
  - ueberfaellige Aufgaben
  - Haushaltsstatus
  - Ruhezeiten

## Supabase ausfuehren

1. Migration `0010_task_reminder_dispatch.sql` im SQL Editor ausfuehren.
2. Migration `0011_notification_preference_controls.sql` im SQL Editor ausfuehren.
3. Migration `0012_notification_dispatch_expansion.sql` im SQL Editor ausfuehren.
4. Edge Function deployen.
5. Secret fuer Cron-Aufruf setzen.
6. Cron Job anlegen.
7. Auf Samsung Push aktivieren und Aufgabe mit Erinnerung in das naechste Zeitfenster legen.

## PowerShell Deploy

```powershell
cd "C:\Users\hoffm\Documents\Family Organizer"
$env:PATH='C:\Users\hoffm\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;C:\Users\hoffm\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin;' + $env:PATH
$secret=[guid]::NewGuid().ToString("N")
& 'C:\Users\hoffm\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd' dlx supabase@latest secrets set HOMELY_REMINDER_SECRET="$secret" --project-ref enjogmjdasznqclbhkgs
& 'C:\Users\hoffm\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd' dlx supabase@latest functions deploy send-task-reminders --project-ref enjogmjdasznqclbhkgs --no-verify-jwt
```

Das Secret danach fuer den Cron SQL Schritt bereithalten. Nicht in Git speichern.

## Cron SQL

Supabase empfiehlt fuer geplante Edge Functions `pg_cron` zusammen mit `pg_net`. Die Secrets sollten ueber Supabase Vault gelesen werden.

```sql
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select vault.create_secret('https://enjogmjdasznqclbhkgs.supabase.co', 'homely_project_url');
select vault.create_secret('HIER_DAS_GENERIERTE_HOMELY_REMINDER_SECRET_EINTRAGEN', 'homely_reminder_secret');

select cron.schedule(
  'homely-task-reminders-every-5-minutes',
  '*/5 * * * *',
  $$
  select
    net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'homely_project_url') || '/functions/v1/send-task-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-homely-reminder-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'homely_reminder_secret')
      ),
      body := '{"aheadMinutes":15,"graceMinutes":10,"limit":100}'::jsonb
    ) as request_id;
  $$
);
```

## Test

- In der App unter `Mehr > Konto > Push` Push aktivieren.
- `Test senden` pruefen.
- Ruhezeiten speichern und nach `Status` erneut kontrollieren.
- Eine Aufgabe mit Erinnerung `Am Tag` und Uhrzeit im naechsten 15-Minuten-Fenster anlegen.
- Eine zweite Aufgabe innerhalb der Ruhezeit anlegen und pruefen, dass der Claim auf das Ende der Ruhezeit verschoben wird.
- Eine offene Aufgabe aus einem vergangenen Datum behalten und pruefen, dass einmal taeglich eine zusammengefasste Ueberfaellig-Erinnerung entsteht.
- Fuer einen Gruender/Verwalter `Haushaltsstatus` aktivieren und pruefen, dass einmal taeglich ein Status-Push mit erledigt/offen entsteht.
- `Plan hochladen`, falls der Haushalt synchronisiert ist.
- Cron abwarten oder Function manuell invoke.
- `notification_log` pruefen:
  - `pending`: claim angelegt, Versand laeuft/haengt.
  - `sent`: Expo Push Ticket erhalten.
  - `failed`: kein Token oder Expo-Fehler.
- Bei `DeviceNotRegistered` deaktiviert die Function den betroffenen Token.

## Versandarten

- `task_reminder`: einzelne Aufgabe zur geplanten Erinnerungszeit.
- `task_overdue`: einmal taegliche Zusammenfassung ueberfaelliger eigener Aufgaben, standardmaessig 09:00 Uhr lokal.
- `household_summary`: einmal taeglicher Haushaltsstatus fuer Gruender/Verwalter, standardmaessig 18:00 Uhr lokal.

Alle Versandarten nutzen `notification_log`, `notification_key`, Opt-in, aktive Expo Push Tokens und Ruhezeiten. Dadurch sollen keine doppelten Pushs entstehen.

## Manuelles Invoke

```powershell
cd "C:\Users\hoffm\Documents\Family Organizer"
$env:PATH='C:\Users\hoffm\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;C:\Users\hoffm\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin;' + $env:PATH
& 'C:\Users\hoffm\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd' dlx supabase@latest functions invoke send-task-reminders --project-ref enjogmjdasznqclbhkgs --body '{"aheadMinutes":15,"graceMinutes":10,"limit":10}'
```

Wenn das Invoke keine Header fuer `x-homely-reminder-secret` senden kann, lokal per HTTP-Client gegen die Function-URL testen oder ueber Cron mit Vault ausloesen.

## Quellen

- Supabase Scheduling Edge Functions: https://supabase.com/docs/guides/functions/schedule-functions
- Supabase Cron: https://supabase.com/docs/guides/cron
- Expo Push Service: https://docs.expo.dev/push-notifications/sending-notifications/
