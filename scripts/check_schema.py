import sys
import os
from dotenv import load_dotenv

sys.path.append('c:/Users/karri/Downloads/Risk-Dashboard-UI/backend')
load_dotenv('c:/Users/karri/Downloads/Risk-Dashboard-UI/.env')

from supabase import create_client, Client

url: str = os.environ.get("VITE_SUPABASE_URL")
key: str = os.environ.get("VITE_SUPABASE_ANON_KEY")
supabase: Client = create_client(url, key)

import uuid
dummy_id = str(uuid.uuid4())
try:
    res = supabase.table('pdf_analyses').insert({
        "id": dummy_id,
        "user_id": dummy_id, 
        "summary": {"test": "hello"},
    }).execute()
    print("Success summary:", res)
except Exception as e:
    print("DB Insert Error for pdf_analyses summary:", str(e))
