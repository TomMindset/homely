import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type, x-homely-reminder-secret",
  "access-control-allow-methods": "POST, OPTIONS",
};

type ReminderClaim = {
  log_id: string;
  user_id: string;
  household_id: string;
  household_name: string;
  assignment_id: string;
  task_id: string;
  task_title: string;
  member_name: string;
  due_at: string;
};

type PushToken = {
  id: string;
  user_id: string;
  expo_push_token: string;
};

type ExpoTicket = {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
};

type ExpoPushItem = {
  tokenId: string;
  logId: string;
  to: string;
  message: Record<string, unknown>;
};

type LogResult = {
  okCount: number;
  ticketIds: string[];
  errors: string[];
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

function firstSecretFromJsonDictionary(value: string | undefined) {
  if (!value) return "";
  try {
    const parsed = JSON.parse(value) as Record<string, string>;
    return parsed.default ?? Object.values(parsed)[0] ?? "";
  } catch {
    return "";
  }
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function getNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function getIsoWindow(body: Record<string, unknown>) {
  const now = Date.now();
  const graceMinutes = Math.max(0, Math.min(getNumber(body.graceMinutes, 10), 120));
  const aheadMinutes = Math.max(1, Math.min(getNumber(body.aheadMinutes, 15), 240));
  return {
    start: new Date(now - graceMinutes * 60_000).toISOString(),
    end: new Date(now + aheadMinutes * 60_000).toISOString(),
    limit: Math.max(1, Math.min(getNumber(body.limit, 100), 500)),
  };
}

function reminderBody(claim: ReminderClaim) {
  const dayPrefix = new Date(claim.due_at).toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "2-digit" });
  return `${claim.member_name}: ${claim.task_title} ist faellig (${dayPrefix}).`;
}

function buildExpoMessage(claim: ReminderClaim, token: PushToken) {
  return {
    to: token.expo_push_token,
    title: "Homely Erinnerung",
    body: reminderBody(claim),
    sound: "default",
    channelId: "task-reminders",
    data: {
      type: "task_reminder",
      logId: claim.log_id,
      householdId: claim.household_id,
      assignmentId: claim.assignment_id,
      taskId: claim.task_id,
    },
  };
}

async function updateLog(adminClient: ReturnType<typeof createClient>, logId: string, result: LogResult) {
  const ok = result.okCount > 0;
  const { error } = await adminClient
    .from("notification_log")
    .update({
      status: ok ? "sent" : "failed",
      sent_at: ok ? new Date().toISOString() : null,
      expo_ticket_id: result.ticketIds[0] ?? null,
      error_message: result.errors.length ? result.errors.slice(0, 5).join(" | ") : null,
    })
    .eq("id", logId);

  if (error) {
    console.error("send-task-reminders log update failed", { logId, error });
  }
}

async function disableDeviceToken(adminClient: ReturnType<typeof createClient>, tokenId: string) {
  const { error } = await adminClient.from("push_tokens").update({ disabled_at: new Date().toISOString() }).eq("id", tokenId);
  if (error) {
    console.error("send-task-reminders token disable failed", { tokenId, error });
  }
}

async function sendExpoChunks(adminClient: ReturnType<typeof createClient>, items: ExpoPushItem[], expoAccessToken: string) {
  const results = new Map<string, LogResult>();
  items.forEach((item) => {
    if (!results.has(item.logId)) {
      results.set(item.logId, { okCount: 0, ticketIds: [], errors: [] });
    }
  });

  for (const currentChunk of chunk(items, 100)) {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(expoAccessToken ? { authorization: `Bearer ${expoAccessToken}` } : {}),
      },
      body: JSON.stringify(currentChunk.map((item) => item.message)),
    });

    const body = (await response.json().catch(() => ({}))) as { data?: ExpoTicket[] | ExpoTicket; errors?: Array<{ message?: string }> };
    const tickets = Array.isArray(body.data) ? body.data : body.data ? [body.data] : [];

    if (!response.ok || !tickets.length) {
      const message = body.errors?.map((error) => error.message).filter(Boolean).join(" | ") || `Expo request failed with ${response.status}`;
      currentChunk.forEach((item) => results.get(item.logId)?.errors.push(message));
      continue;
    }

    await Promise.all(
      currentChunk.map(async (item, index) => {
        const ticket = tickets[index];
        const result = results.get(item.logId);
        if (!result || !ticket) return;

        if (ticket.status === "ok") {
          result.okCount += 1;
          if (ticket.id) result.ticketIds.push(ticket.id);
          return;
        }

        const errorMessage = ticket.message || ticket.details?.error || "Expo ticket error";
        result.errors.push(errorMessage);
        if (ticket.details?.error === "DeviceNotRegistered") {
          await disableDeviceToken(adminClient, item.tokenId);
        }
      }),
    );
  }

  await Promise.all([...results.entries()].map(([logId, result]) => updateLog(adminClient, logId, result)));
  return results;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { ok: false, message: "Method not allowed" });
  }

  const reminderSecret = Deno.env.get("HOMELY_REMINDER_SECRET") ?? "";
  const providedSecret = request.headers.get("x-homely-reminder-secret") ?? "";
  if (!reminderSecret || providedSecret !== reminderSecret) {
    return jsonResponse(401, { ok: false, message: "Reminder dispatch is not authorized." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const secretKey =
    Deno.env.get("HOMELY_SUPABASE_SECRET_KEY") ||
    firstSecretFromJsonDictionary(Deno.env.get("SUPABASE_SECRET_KEYS")) ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    "";
  const expoAccessToken = Deno.env.get("EXPO_ACCESS_TOKEN") ?? "";

  if (!supabaseUrl || !secretKey) {
    return jsonResponse(500, { ok: false, message: "Supabase Edge Function secrets are not configured." });
  }

  const requestBody = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const window = getIsoWindow(requestBody);
  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false },
  });

  const { data: claims, error: claimError } = await adminClient.rpc("claim_due_task_reminders", {
    target_window_start: window.start,
    target_window_end: window.end,
    target_max_items: window.limit,
  });

  if (claimError) {
    console.error("send-task-reminders claim failed", claimError);
    return jsonResponse(500, { ok: false, message: claimError.message });
  }

  const reminderClaims = (claims ?? []) as ReminderClaim[];
  if (!reminderClaims.length) {
    return jsonResponse(200, { ok: true, message: "No due task reminders.", claimed: 0, sent: 0, failed: 0 });
  }

  const userIds = [...new Set(reminderClaims.map((claim) => claim.user_id))];
  const { data: tokenRows, error: tokenError } = await adminClient
    .from("push_tokens")
    .select("id,user_id,expo_push_token")
    .in("user_id", userIds)
    .is("disabled_at", null);

  if (tokenError) {
    console.error("send-task-reminders tokens failed", tokenError);
    await Promise.all(reminderClaims.map((claim) => updateLog(adminClient, claim.log_id, { okCount: 0, ticketIds: [], errors: [tokenError.message] })));
    return jsonResponse(500, { ok: false, message: tokenError.message });
  }

  const tokensByUserId = new Map<string, PushToken[]>();
  ((tokenRows ?? []) as PushToken[]).forEach((token) => {
    tokensByUserId.set(token.user_id, [...(tokensByUserId.get(token.user_id) ?? []), token]);
  });

  const expoItems: ExpoPushItem[] = [];
  await Promise.all(
    reminderClaims.map(async (claim) => {
      const tokens = tokensByUserId.get(claim.user_id) ?? [];
      if (!tokens.length) {
        await updateLog(adminClient, claim.log_id, { okCount: 0, ticketIds: [], errors: ["No active push token for user"] });
        return;
      }

      tokens.forEach((token) => {
        expoItems.push({
          tokenId: token.id,
          logId: claim.log_id,
          to: token.expo_push_token,
          message: buildExpoMessage(claim, token),
        });
      });
    }),
  );

  const results = await sendExpoChunks(adminClient, expoItems, expoAccessToken);
  const sent = [...results.values()].filter((result) => result.okCount > 0).length;
  const failed = reminderClaims.length - sent;

  return jsonResponse(200, {
    ok: true,
    message: `${sent} reminder(s) sent, ${failed} failed.`,
    claimed: reminderClaims.length,
    sent,
    failed,
  });
});
