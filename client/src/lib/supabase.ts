import { createClient } from "@supabase/supabase-js";

type SupabaseRuntimeConfig = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

declare global {
  interface Window {
    __RISK_DASHBOARD_CONFIG__?: SupabaseRuntimeConfig;
  }
}

export function getSupabaseConfig() {
  const runtime = (typeof window !== "undefined" ? window.__RISK_DASHBOARD_CONFIG__ : undefined) ?? {};
  const url = runtime.supabaseUrl ?? (import.meta.env.VITE_SUPABASE_URL as unknown);
  const anonKey = runtime.supabaseAnonKey ?? (import.meta.env.VITE_SUPABASE_ANON_KEY as unknown);

  return {
    url: typeof url === "string" ? url : "",
    anonKey: typeof anonKey === "string" ? anonKey : "",
  };
}

const supabaseConfig = getSupabaseConfig();

export const hasSupabaseEnv = Boolean(supabaseConfig.url && supabaseConfig.anonKey);

if (!hasSupabaseEnv) {
  // Don't create a client with empty strings (supabase-js will throw).
  // The app should detect this and render a friendly configuration message.
  console.error("Missing Supabase environment variables");
}

export const supabase = hasSupabaseEnv
  ? createClient(supabaseConfig.url, supabaseConfig.anonKey)
  : null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY at build time.");
  }
  return supabase;
}
