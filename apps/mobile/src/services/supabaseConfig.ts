export type SupabaseConnectionStatus = "missing" | "configured";

export const supabaseConfig = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  publishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
};

export function getSupabaseConnectionStatus(): SupabaseConnectionStatus {
  return supabaseConfig.url && supabaseConfig.publishableKey ? "configured" : "missing";
}

export function getSupabaseStatusLabel() {
  return getSupabaseConnectionStatus() === "configured" ? "Supabase konfiguriert" : "Supabase noch nicht verbunden";
}
