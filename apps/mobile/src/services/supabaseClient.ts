import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";
import { getSupabaseConnectionStatus, supabaseConfig } from "./supabaseConfig";

export const supabase =
  getSupabaseConnectionStatus() === "configured"
    ? createClient(supabaseConfig.url, supabaseConfig.publishableKey, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

export function requireSupabase() {
  if (!supabase) {
    return {
      client: null,
      error: "Supabase ist noch nicht verbunden. Bitte .env mit Projekt-URL und Anon-Key anlegen.",
    };
  }

  return { client: supabase, error: "" };
}
