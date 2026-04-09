/**
 * Runtime config for deployments that can't inject Vite build-time env vars.
 *
 * Fill these in before deploying (or let the build step write them):
 * - supabaseUrl: your project URL (https://xxxx.supabase.co)
 * - supabaseAnonKey: your anon/public key (JWT starting with eyJ...)
 *
 * IMPORTANT: Never put the Supabase service role key here.
 */
window.__RISK_DASHBOARD_CONFIG__ = {
  // Public values used by the client. Safe to include in the bundle.
  // Do not put `SUPABASE_SERVICE_ROLE_KEY` here.
  supabaseUrl: "https://qtaqtvaczqbogrhdbgdo.supabase.co",
  supabaseAnonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0YXF0dmFjenFib2dyaGRiZ2RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4Nzg2NDQsImV4cCI6MjA4NDQ1NDY0NH0.A13mxkuQw2RXANwiy8b22BsyJtaHQ776RhJQBoF-0l0",
};
