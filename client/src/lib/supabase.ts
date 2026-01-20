import { createClient } from "@supabase/supabase-js";

// Ensure environment variables are present
if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  // We log an error but don't throw immediately to allow the page to render an error message if needed
  console.error("Missing Supabase environment variables");
}

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || "",
  import.meta.env.VITE_SUPABASE_ANON_KEY || ""
);
