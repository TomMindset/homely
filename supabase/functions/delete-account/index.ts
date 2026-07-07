import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type, x-homely-user-token",
  "access-control-allow-methods": "POST, OPTIONS",
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

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { ok: false, message: "Method not allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const publishableKey =
    Deno.env.get("HOMELY_SUPABASE_PUBLISHABLE_KEY") ||
    firstSecretFromJsonDictionary(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")) ||
    Deno.env.get("SUPABASE_ANON_KEY") ||
    "";
  const secretKey =
    Deno.env.get("HOMELY_SUPABASE_SECRET_KEY") ||
    firstSecretFromJsonDictionary(Deno.env.get("SUPABASE_SECRET_KEYS")) ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    "";
  const authorizationHeader = request.headers.get("authorization") ?? "";
  const explicitUserToken = request.headers.get("x-homely-user-token") ?? "";
  const userAccessToken = authorizationHeader.toLowerCase().startsWith("bearer ")
    ? authorizationHeader.slice("bearer ".length).trim()
    : explicitUserToken.trim();

  if (!supabaseUrl || !publishableKey || !secretKey) {
    console.error("delete-account missing env", {
      hasSupabaseUrl: !!supabaseUrl,
      hasPublishableKey: !!publishableKey,
      hasSecretKey: !!secretKey,
    });
    return jsonResponse(500, { ok: false, message: "Supabase Edge Function secrets are not configured." });
  }

  if (!userAccessToken) {
    return jsonResponse(401, { ok: false, message: "Missing user access token." });
  }

  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: `Bearer ${userAccessToken}` } },
    auth: { persistSession: false },
  });
  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  const user = userData.user;

  if (userError || !user) {
    console.error("delete-account invalid user session", userError);
    return jsonResponse(401, { ok: false, message: "Account session is invalid or expired." });
  }

  const { error: prepareError } = await userClient.rpc("prepare_account_deletion");
  if (prepareError) {
    console.error("delete-account prepare failed", prepareError);
    return jsonResponse(400, { ok: false, message: prepareError.message });
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id, true);
  if (deleteError) {
    console.error("delete-account auth delete failed", deleteError);
    return jsonResponse(500, { ok: false, message: deleteError.message });
  }

  return jsonResponse(200, { ok: true, message: "Account and associated Homely cloud data were deleted." });
});
