## Packages
@supabase/supabase-js | Supabase client library for authentication
clsx | Utility for constructing className strings conditionally
lucide-react | Icon set (already in base but ensuring availability)

## Notes
Supabase URL and Key must be provided in environment variables:
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY

The app uses Plain CSS (no Tailwind utility classes in markup) as requested.
API calls require the Supabase JWT in the Authorization header.
