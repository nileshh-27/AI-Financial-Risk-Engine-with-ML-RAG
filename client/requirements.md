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

## Deployment (Netlify)
If you see “Supabase not configured”, the deploy is missing `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, so authentication and profile data can’t load.

- Netlify drag-and-drop: rebuild locally with a `.env` file present at the repo root, then upload `dist/public`.
- Netlify Git deploy: set the env vars in Netlify Site settings → Environment variables, then redeploy.
