import os
import uuid
import sys
import asyncio
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, Request, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import ollama

# Load env from project root
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# Internal imports (Backend logic)
from backend.pdf_parser import parse_pdf
from backend.categorizer import get_categorizer, TransactionCategorizer
from backend.recurring_detector import detect_recurring
from backend.debt_trap_analyzer import analyze_debt_traps
from backend.predictor import predict_next_fy
from backend.mailer import send_analysis_email
from llm_modules.llm import generate_explanation

app = FastAPI(title="Financial Risk Engine API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://127.0.0.1:5000", "http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase setup
SUPABASE_URL = os.environ.get("SUPABASE_URL", os.environ.get("VITE_SUPABASE_URL", ""))
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", os.environ.get("SUPABASE_ANON_KEY", ""))

def get_supabase():
    from supabase import create_client
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def extract_user_info(auth_header: str):
    """Simple extraction of user info from Supabase JWT."""
    if not auth_header.startswith("Bearer "):
        return {}
    token = auth_header.split(" ")[1]
    import jwt # Requires pyjwt
    try:
        decoded = jwt.decode(token, options={"verify_signature": False})
        return {"user_id": decoded.get("sub"), "email": decoded.get("email")}
    except Exception:
        return {}

@app.post("/api/analysis/upload")
async def upload_analysis(
    request: Request,
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...)
):
    """
    Asynchronous PDF analysis endpoint.
    Parses statements, runs ML risk engine, and stores results in Supabase.
    """
    auth_header = request.headers.get("Authorization", "")
    user_info = extract_user_info(auth_header)
    user_id = user_info.get("user_id")
    user_email = user_info.get("email")

    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    all_transactions = []
    file_reports = []
    
    # Process files asynchronously
    import tempfile
    
    for file in files:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        try:
            # Run parser (CPU intensitve, could use run_in_executor but async/await is fine here)
            result = parse_pdf(tmp_path)
            all_transactions.extend(result["transactions"])
            file_reports.append({
                "filename": file.filename,
                "bank": result["bank"],
                "period": result["period"],
                "transaction_count": len(result["transactions"])
            })
        finally:
            os.remove(tmp_path)

    if not all_transactions:
        raise HTTPException(status_code=400, detail="No valid transactions found in the provided files.")

    # 1. Multi-Step Analysis Pipeline
    try:
        categorizer = get_categorizer()
        print(f"DEBUG: Categorizer Type: {type(categorizer)}")
        for txn in all_transactions:
            # Explicitly calling the method to be safe
            cat_info = TransactionCategorizer.categorize(categorizer, txn["description"])
            txn["category"] = cat_info.get("category", "Miscellaneous")
            txn["category_method"] = cat_info.get("method", "default")
    except Exception as e:
        print(f"DEBUG: Categorization failed: {e}")
        for txn in all_transactions:
            txn["category"] = "Miscellaneous"
            txn["category_method"] = "error-fallback"

    # Debt Trap Analysis (ML)
    debt_traps = analyze_debt_traps(all_transactions)
    
    # Recurring Payments
    recurring = detect_recurring(all_transactions)

    # Prediction (ML)
    prediction = predict_next_fy(all_transactions)

    # Category Summary
    category_summary = {}
    for txn in all_transactions:
        cat = txn["category"]
        category_summary[cat] = category_summary.get(cat, 0) + txn["amount"]
    
    cat_summary_list = [
        {"category": cat, "total": data}
        for cat, data in category_summary.items()
    ]
    cat_summary_list.sort(key=lambda x: x["total"], reverse=True)

    # Overall stats
    total_debit = sum(t["amount"] for t in all_transactions if t.get("type") == "debit")
    total_credit = sum(t["amount"] for t in all_transactions if t.get("type") == "credit")

    # 2. Generate AI Assessment (Async Stream Collection)
    llm_analysis = "Assessment Unavailable"
    try:
        top_features = []
        for cat in cat_summary_list[:2]:
            top_features.append({"feature": f"{cat['category']} Spending", "value": f"₹{cat['total']}", "impact": 0.8 if cat['total'] > 5000 else 0.3})
        
        for trap in debt_traps[:2]:
            top_features.append({"feature": trap["title"], "value": "Alert", "impact": 1.5})

        explanation_data = {
            "predicted_probability": 0.9 if debt_traps else 0.2,
            "prediction": 1 if debt_traps else 0,
            "top_features": top_features
        }
        
        # Call modular AI engine
        stream = generate_explanation(explanation_data)
        full_text = []
        for chunk in stream:
            if 'message' in chunk and 'content' in chunk['message']:
                full_text.append(chunk['message']['content'])
        llm_analysis = "".join(full_text).strip()
    except Exception as e:
        print(f"AI Generation Error: {e}", file=sys.stderr)

    analysis_result = {
        "id": str(uuid.uuid4()),
        "summary": {
            "total_transactions": len(all_transactions),
            "total_debit": total_debit,
            "total_credit": total_credit,
            "net_flow": total_credit - total_debit,
            "categories_found": len(cat_summary_list),
            "period": f"{all_transactions[0]['date']} to {all_transactions[-1]['date']}" if all_transactions else "N/A"
        },
        "category_summary": cat_summary_list,
        "recurring_payments": recurring,
        "debt_traps": debt_traps,
        "prediction": prediction,
        "llm_analysis": llm_analysis,
        "analyzed_at": datetime.now().isoformat()
    }

    # 3. Persistent Storage (Supabase)
    try:
        sb = get_supabase()
        
        # Background: Send email report
        if user_email:
            background_tasks.add_task(send_analysis_email, user_email, analysis_result, file_reports)

        # Store analysis
        sb.table("pdf_analyses").insert({
            "id": analysis_result["id"],
            "user_id": user_id,
            "file_reports": file_reports,
            "summary": analysis_result["summary"],
            "category_summary": cat_summary_list,
            "recurring_payments": recurring,
            "debt_traps": debt_traps,
            "prediction": prediction,
            "llm_analysis": llm_analysis
        }).execute()

        # Batch store transactions
        txn_rows = []
        for txn in all_transactions:
            txn_rows.append({
                "id": str(uuid.uuid4())[:8],
                "user_id": user_id,
                "date": txn["date"],
                "merchant": txn.get("merchant") or txn.get("description", "Unknown"),
                "category": txn["category"],
                "amount": txn["amount"],
                "channel": txn.get("category_method", "pdf"),
                "status": "credit" if txn["type"].lower() == "credit" else "debit",
                "risk_flag": "Low",
            })
        if txn_rows:
            sb.table("transactions").insert(txn_rows).execute()

    except Exception as e:
        print(f"Storage failed: {e}", file=sys.stderr)
        analysis_result["storage_warning"] = str(e)

    return analysis_result

@app.post("/api/chat")
async def chat(request: Request):
    """
    RAG-enabled chat using FastAPI StreamingResponse.
    """
    auth_header = request.headers.get("Authorization", "")
    user_info = extract_user_info(auth_header)
    user_id = user_info.get("user_id")

    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    data = await request.json()
    messages = data.get("messages", [])
    if not messages:
        return JSONResponse({"message": {"role": "assistant", "content": "Hello! How can I help you today?"}})

    # Fetch context (RAG)
    try:
        sb = get_supabase()
        txn_res = sb.table("transactions").select("date,merchant,category,amount,status").eq("user_id", user_id).order("date", desc=True).limit(50).execute()
        
        context_parts = [
            "You are a Strict Financial Data Assistant. Use ONLY the data below.",
            "If the answer isn't in the data, say you don't know."
        ]
        if txn_res.data:
            txns_str = "\n".join([f"- {t['date']}: {t['merchant']} ({t['category']}) - ₹{t['amount']} [{t['status']}]" for t in txn_res.data])
            context_parts.append(f"Transaction History:\n{txns_str}")
        
        system_prompt = "\n".join(context_parts)
    except Exception:
        system_prompt = "You are a Financial Assistant."

    async def event_generator():
        # Using synchronous ollama call within a generator is okay, or use awaitable if library supports it
        # For true async with ollama: run in thread pool
        loop = asyncio.get_event_loop()
        stream = await loop.run_in_executor(None, lambda: ollama.chat(
            model='gemma3:1b',
            messages=[
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': messages[-1]['content']}
            ],
            stream=True
        ))
        
        for chunk in stream:
            if 'message' in chunk and 'content' in chunk['message']:
                yield chunk['message']['content']

    return StreamingResponse(event_generator(), media_type="text/plain")

@app.post("/api/risk/assess")
async def assess_risk(request: Request):
    """
    Manual Risk Assessment Endpoint.
    Evaluates transaction metadata and assigns a risk score and level.
    """
    auth_header = request.headers.get("Authorization", "")
    user_info = extract_user_info(auth_header)
    user_id = user_info.get("user_id")

    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    data = await request.json()
    amount = data.get("transactionAmount", 0)
    category = data.get("merchantCategory", "unknown")
    intl = data.get("isInternational", False)
    chargebacks = data.get("previousChargebacks", 0)

    # Basic risk heuristic
    score = 10
    if amount > 10000:
        score += 30
    if intl:
        score += 20
    if chargebacks > 0:
        score += 40

    score = min(score, 100)

    if score > 70:
        level = "High"
        rec = "Block or require manual verification."
    elif score > 40:
        level = "Medium"
        rec = "Flag for review."
    else:
        level = "Low"
        rec = "Proceed normally."

    return {
        "score": score,
        "level": level,
        "recommendation": rec
    }

@app.get("/api/analysis/history")
async def get_history(request: Request):
    auth_header = request.headers.get("Authorization", "")
    user_info = extract_user_info(auth_header)
    user_id = user_info.get("user_id")

    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    sb = get_supabase()
    result = sb.table("pdf_analyses").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    return result.data or []

# Serve Frontend Static Files
# Mount static files at the end to avoid catching API routes
if os.path.exists("client/dist"):
    app.mount("/", StaticFiles(directory="client/dist", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 5000))
    uvicorn.run(app, host="0.0.0.0", port=port)
