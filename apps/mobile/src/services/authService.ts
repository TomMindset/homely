import { requireSupabase, supabase } from "./supabaseClient";
import { supabaseConfig } from "./supabaseConfig";

export type AuthActionResult = {
  ok: boolean;
  message: string;
};

function authErrorMessage(message?: string) {
  if (!message) return "Die Aktion konnte nicht abgeschlossen werden.";
  if (message.toLowerCase().includes("invalid login")) return "E-Mail oder Passwort passen nicht.";
  if (message.toLowerCase().includes("email rate limit")) return "Bitte warte kurz, bevor erneut eine E-Mail angefordert wird.";
  return message;
}

export function getAuthRedirectUrl() {
  return "homely://auth/callback";
}

function paramsFromAuthUrl(url: string) {
  const parts: string[] = [];
  const queryIndex = url.indexOf("?");
  const hashIndex = url.indexOf("#");

  if (queryIndex >= 0) {
    const end = hashIndex >= 0 ? hashIndex : url.length;
    parts.push(url.slice(queryIndex + 1, end));
  }

  if (hashIndex >= 0) {
    parts.push(url.slice(hashIndex + 1));
  }

  return new URLSearchParams(parts.filter(Boolean).join("&"));
}

function deletionErrorMessage(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("could not find the function") || lower.includes("schema cache") || lower.includes("prepare_account_deletion")) {
    return "Kontoloeschung nicht bereit: Bitte Migration 0007_account_deletion_support.sql im Supabase SQL Editor ausfuehren.";
  }
  if (lower.includes("secrets are not configured") || lower.includes("service_role") || lower.includes("secret")) {
    return "Kontoloeschung nicht bereit: Die Edge Function braucht einen Supabase Secret/Service-Role-Key als Function Secret.";
  }
  if (lower.includes("invalid") || lower.includes("expired") || lower.includes("missing bearer") || lower.includes("jwt")) {
    return `Kontoloeschung nicht bereit: Token-Pruefung fehlgeschlagen (${message}). Bitte App neu laden und erneut einloggen.`;
  }
  return `Kontoloeschung konnte nicht abgeschlossen werden: ${message}`;
}

async function parseDeletionResponse(response: Response) {
  const text = await response.text();
  const prefix = `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`;
  if (!text) return prefix;

  try {
    const payload = JSON.parse(text) as { message?: string; error?: string };
    return `${prefix}: ${payload.message || payload.error || text}`;
  } catch {
    return `${prefix}: ${text}`;
  }
}

export async function signUpWithEmail(email: string, password: string, displayName: string): Promise<AuthActionResult> {
  const { client, error } = requireSupabase();
  if (!client) return { ok: false, message: error };
  if (!email.trim() || password.length < 8) {
    return { ok: false, message: "Bitte E-Mail und ein Passwort mit mindestens 8 Zeichen eingeben." };
  }

  const { error: signUpError } = await client.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      emailRedirectTo: getAuthRedirectUrl(),
      data: {
        display_name: displayName.trim(),
      },
    },
  });

  if (signUpError) return { ok: false, message: authErrorMessage(signUpError.message) };
  return {
    ok: true,
    message: "Konto-Anfrage verarbeitet. Bitte pruefe die E-Mail. Falls das Konto bereits existiert, wird das Passwort dadurch nicht geaendert.",
  };
}

export async function signInWithEmail(email: string, password: string): Promise<AuthActionResult> {
  const { client, error } = requireSupabase();
  if (!client) return { ok: false, message: error };

  const { error: signInError } = await client.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (signInError) return { ok: false, message: authErrorMessage(signInError.message) };
  return { ok: true, message: "Du bist eingeloggt." };
}

export async function signOut(): Promise<AuthActionResult> {
  const { client, error } = requireSupabase();
  if (!client) return { ok: false, message: error };

  const { error: signOutError } = await client.auth.signOut();
  if (signOutError) return { ok: false, message: authErrorMessage(signOutError.message) };
  return { ok: true, message: "Du bist ausgeloggt." };
}

export async function requestPasswordReset(email: string): Promise<AuthActionResult> {
  const { client, error } = requireSupabase();
  if (!client) return { ok: false, message: error };
  if (!email.trim()) return { ok: false, message: "Bitte E-Mail eingeben." };

  const { error: resetError } = await client.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: getAuthRedirectUrl(),
  });
  if (resetError) return { ok: false, message: authErrorMessage(resetError.message) };
  return { ok: true, message: "Passwort-E-Mail wurde angefordert." };
}

export async function handleAuthRedirectUrl(url: string): Promise<AuthActionResult> {
  const { client, error } = requireSupabase();
  if (!client) return { ok: false, message: error };
  if (!url.startsWith("homely://auth/callback")) return { ok: true, message: "" };

  const params = paramsFromAuthUrl(url);
  const errorDescription = params.get("error_description") || params.get("error");
  if (errorDescription) {
    return { ok: false, message: authErrorMessage(errorDescription) };
  }

  const code = params.get("code");
  if (code) {
    const { error: exchangeError } = await client.auth.exchangeCodeForSession(code);
    if (exchangeError) return { ok: false, message: authErrorMessage(exchangeError.message) };
    return { ok: true, message: "E-Mail-Link bestaetigt. Du bist angemeldet." };
  }

  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (accessToken && refreshToken) {
    const { error: sessionError } = await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (sessionError) return { ok: false, message: authErrorMessage(sessionError.message) };
    return { ok: true, message: "E-Mail-Link bestaetigt. Du bist angemeldet." };
  }

  return { ok: true, message: "" };
}

export async function updatePassword(password: string): Promise<AuthActionResult> {
  const { client, error } = requireSupabase();
  if (!client) return { ok: false, message: error };
  if (password.length < 8) return { ok: false, message: "Das neue Passwort braucht mindestens 8 Zeichen." };

  const { error: updateError } = await client.auth.updateUser({ password });
  if (updateError) return { ok: false, message: authErrorMessage(updateError.message) };
  return { ok: true, message: "Passwort wurde aktualisiert." };
}

export async function requestAccountDeletion(): Promise<AuthActionResult> {
  const { client, error } = requireSupabase();
  if (!client) return { ok: false, message: error };

  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (sessionError || !accessToken) {
    return {
      ok: false,
      message: "Kontoloeschung nicht bereit: Bitte neu einloggen und danach erneut versuchen.",
    };
  }

  try {
    const response = await fetch(`${supabaseConfig.url.replace(/\/$/, "")}/functions/v1/delete-account`, {
      method: "POST",
      headers: {
        apikey: supabaseConfig.publishableKey,
        Authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
        "x-homely-user-token": accessToken,
      },
      body: JSON.stringify({ requestedAt: new Date().toISOString() }),
    });

    if (!response.ok) {
      const message = await parseDeletionResponse(response);
      return {
        ok: false,
        message: deletionErrorMessage(message),
      };
    }
  } catch (fetchError) {
    return {
      ok: false,
      message: deletionErrorMessage(fetchError instanceof Error ? fetchError.message : "Edge Function konnte nicht erreicht werden."),
    };
  }

  return { ok: true, message: "Konto und Homely-Cloud-Daten wurden geloescht." };
}

export async function getCurrentAuthEmail() {
  if (!supabase) return "";
  const { data } = await supabase.auth.getUser();
  return data.user?.email ?? "";
}
